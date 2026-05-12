import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..', '..')
const DEFAULT_DB_PATH = path.join(WORKSPACE_ROOT, '.openclaw', 'bungie-oauth.sqlite')
const DEFAULT_AUTH_URL = 'https://www.bungie.net/en/oauth/authorize'
const DEFAULT_TOKEN_URL = 'https://www.bungie.net/platform/app/oauth/token/'

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    if (process.env[key] !== undefined) continue
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile(path.join(WORKSPACE_ROOT, '.env'))

export const cfg = {
  apiKey: process.env.BUNGIE_API_KEY,
  authUrl: DEFAULT_AUTH_URL,
  tokenUrl: DEFAULT_TOKEN_URL,
  clientId: process.env.BUNGIE_OAUTH_CLIENT_ID,
  clientSecret: process.env.BUNGIE_OAUTH_CLIENT_SECRET,
  redirectUrl: process.env.BUNGIE_OAUTH_REDIRECT_URL,
  appUrl: process.env.BUNGIE_APP_URL,
  dbPath: process.env.BUNGIE_OAUTH_DB_PATH || DEFAULT_DB_PATH,
  encryptionKey: process.env.BUNGIE_TOKEN_ENCRYPTION_KEY || process.env.BUNGIE_OAUTH_CLIENT_SECRET || process.env.BUNGIE_API_KEY,
}

function ensureDbDir() {
  fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true })
}

function interpolate(sql: string, params: Record<string, string | number | null | undefined>) {
  return sql.replace(/\$(\w+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined || value === null) return 'NULL'
    if (typeof value === 'number') return String(value)
    return `'${String(value).replace(/'/g, "''")}'`
  })
}

function sqlite(sql: string, opts: { params?: Record<string, string | number | null | undefined>; header?: boolean } = {}) {
  ensureDbDir()
  const args = [cfg.dbPath, '-json']
  if (opts.header !== false) args.unshift('-header')
  const input = opts.params ? interpolate(sql, opts.params) : sql
  const out = execFileSync('sqlite3', args, { input, encoding: 'utf8' }).trim()
  if (!out) return [] as Array<Record<string, unknown>>
  return JSON.parse(out) as Array<Record<string, unknown>>
}

function execSql(sql: string, opts: { params?: Record<string, string | number | null | undefined> } = {}) {
  ensureDbDir()
  const input = opts.params ? interpolate(sql, opts.params) : sql
  execFileSync('sqlite3', [cfg.dbPath], { input, encoding: 'utf8' })
}

function nowIso() {
  return new Date().toISOString()
}

function randomState() {
  return crypto.randomBytes(24).toString('base64url')
}

function deriveKey() {
  return crypto.createHash('sha256').update(String(cfg.encryptionKey || '')).digest()
}

function encrypt(value: string | null | undefined) {
  if (value == null) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv)
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`
}

export function initDb() {
  execSql(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  return_to TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS bungie_links (
  discord_user_id TEXT PRIMARY KEY,
  bungie_membership_id TEXT NOT NULL,
  bungie_membership_type INTEGER,
  bungie_display_name TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  token_expires_at TEXT NOT NULL,
  refresh_expires_at TEXT,
  scopes TEXT,
  consent_granted_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`)
}

export function logAction(discordUserId: string | null, action: string, status: string, detail?: unknown) {
  execSql(
    `INSERT INTO audit_log (discord_user_id, action, status, detail, created_at) VALUES ($discordUserId, $action, $status, $detail, $createdAt);`,
    {
      params: {
        discordUserId,
        action,
        status,
        detail:
          typeof detail === 'string'
            ? detail.slice(0, 1000)
            : JSON.stringify(detail ?? null).slice(0, 1000),
        createdAt: nowIso(),
      },
    }
  )
}

function createState(discordUserId: string, returnTo: string | null = null, ttlMinutes = 15) {
  const state = randomState()
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
  execSql(
    `INSERT INTO oauth_states (state, discord_user_id, return_to, created_at, expires_at) VALUES ($state, $discordUserId, $returnTo, $createdAt, $expiresAt);`,
    {
      params: { state, discordUserId, returnTo, createdAt, expiresAt },
    }
  )
  return { state, createdAt, expiresAt }
}

export function consumeState(state: string) {
  const rows = sqlite(`SELECT * FROM oauth_states WHERE state = '${String(state).replace(/'/g, "''")}' LIMIT 1;`)
  const row = rows[0]
  if (!row) throw new Error('Invalid OAuth state')
  if (row.used_at) throw new Error('OAuth state already used')
  if (new Date(String(row.expires_at)).getTime() < Date.now()) throw new Error('OAuth state expired')
  execSql(`UPDATE oauth_states SET used_at = $usedAt WHERE state = $state;`, { params: { usedAt: nowIso(), state } })
  return {
    discord_user_id: String(row.discord_user_id),
    return_to: row.return_to ? String(row.return_to) : null,
    created_at: String(row.created_at),
    expires_at: String(row.expires_at),
    used_at: row.used_at ? String(row.used_at) : null,
  }
}

export function getLink(discordUserId: string) {
  const rows = sqlite(`SELECT * FROM bungie_links WHERE discord_user_id = '${String(discordUserId).replace(/'/g, "''")}' LIMIT 1;`)
  return (rows[0] as Record<string, unknown> | undefined) || null
}

export function upsertLink(record: {
  discordUserId: string
  bungieMembershipId: string
  bungieMembershipType?: number | null
  bungieDisplayName?: string | null
  accessToken: string
  refreshToken?: string | null
  tokenType?: string
  tokenExpiresAt: string
  refreshExpiresAt?: string | null
  scopes?: string | string[] | null
  consentGrantedAt?: string | null
}) {
  const now = nowIso()
  execSql(
    `
INSERT INTO bungie_links (
  discord_user_id,
  bungie_membership_id,
  bungie_membership_type,
  bungie_display_name,
  access_token_enc,
  refresh_token_enc,
  token_type,
  token_expires_at,
  refresh_expires_at,
  scopes,
  consent_granted_at,
  revoked_at,
  created_at,
  updated_at
) VALUES (
  $discordUserId,
  $bungieMembershipId,
  $bungieMembershipType,
  $bungieDisplayName,
  $accessTokenEnc,
  $refreshTokenEnc,
  $tokenType,
  $tokenExpiresAt,
  $refreshExpiresAt,
  $scopes,
  $consentGrantedAt,
  NULL,
  $createdAt,
  $updatedAt
)
ON CONFLICT(discord_user_id) DO UPDATE SET
  bungie_membership_id=excluded.bungie_membership_id,
  bungie_membership_type=excluded.bungie_membership_type,
  bungie_display_name=excluded.bungie_display_name,
  access_token_enc=excluded.access_token_enc,
  refresh_token_enc=excluded.refresh_token_enc,
  token_type=excluded.token_type,
  token_expires_at=excluded.token_expires_at,
  refresh_expires_at=excluded.refresh_expires_at,
  scopes=excluded.scopes,
  consent_granted_at=excluded.consent_granted_at,
  revoked_at=NULL,
  updated_at=excluded.updated_at;
`,
    {
      params: {
        discordUserId: record.discordUserId,
        bungieMembershipId: record.bungieMembershipId,
        bungieMembershipType: record.bungieMembershipType ?? null,
        bungieDisplayName: record.bungieDisplayName ?? null,
        accessTokenEnc: encrypt(record.accessToken),
        refreshTokenEnc: record.refreshToken ? encrypt(record.refreshToken) : null,
        tokenType: record.tokenType || 'Bearer',
        tokenExpiresAt: record.tokenExpiresAt,
        refreshExpiresAt: record.refreshExpiresAt ?? null,
        scopes: record.scopes ? JSON.stringify(record.scopes) : null,
        consentGrantedAt: record.consentGrantedAt || now,
        createdAt: now,
        updatedAt: now,
      },
    }
  )
}

function canonicalizeUrl(value: string | undefined, fallback: string) {
  try {
    const url = new URL(value || fallback)
    if (/bungie\.net$/i.test(url.hostname)) {
      url.pathname = url.pathname.toLowerCase()
    }
    return url.toString().replace(/\/$/, '/')
  } catch {
    return fallback
  }
}

export async function exchangeCode(code: string) {
  const authUrl = canonicalizeUrl(cfg.authUrl, DEFAULT_AUTH_URL)
  const tokenUrl = canonicalizeUrl(cfg.tokenUrl, DEFAULT_TOKEN_URL)
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUrl || !cfg.apiKey) {
    throw new Error('Missing Bungie config')
  }
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`, 'utf8').toString('base64')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
  })
  if (cfg.redirectUrl) body.set('redirect_uri', cfg.redirectUrl)

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-API-Key': cfg.apiKey,
      'User-Agent': 'girth-bungie-oauth/1.0',
    },
    body,
  })
  const json = (await res.json()) as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      (typeof json.error_description === 'string' && json.error_description) ||
        (typeof json.Message === 'string' && json.Message) ||
        `OAuth token exchange failed (${res.status})`
    )
  }
  void authUrl
  return json
}

export function buildAuthUrl({ discordUserId, returnTo = null }: { discordUserId: string; returnTo?: string | null }) {
  const { state } = createState(discordUserId, returnTo)
  const url = new URL(canonicalizeUrl(cfg.authUrl, DEFAULT_AUTH_URL))
  if (!cfg.clientId) throw new Error('Missing Bungie config')
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  if (cfg.redirectUrl) url.searchParams.set('redirect_uri', cfg.redirectUrl)
  return { state, url: url.toString() }
}

export function revokeLink(discordUserId: string, reason = 'manual') {
  execSql(`UPDATE bungie_links SET revoked_at = $revokedAt, updated_at = $updatedAt WHERE discord_user_id = $discordUserId;`, {
    params: { discordUserId, revokedAt: nowIso(), updatedAt: nowIso() },
  })
  logAction(discordUserId, 'revoke', 'ok', reason)
}
