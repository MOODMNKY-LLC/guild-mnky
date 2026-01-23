/**
 * Discord Bot Constants
 * Configuration values for guild IDs, channel IDs, and other constants
 */

export const GUILD_IDS = {
  SHERPA_HUB: process.env.SHERPA_HUB_GUILD_ID || '1291190711919837234',
  JUPITERS_GIRTH: process.env.JUPITERS_GIRTH_GUILD_ID || '573823015511392268',
} as const

export const CHANNEL_IDS = {
  // Sherpa Hub channels (to be configured)
  SHERPA_APPLICATIONS: process.env.SHERPA_APPLICATIONS_CHANNEL_ID,
  SHERPA_REQUESTS: process.env.SHERPA_REQUESTS_CHANNEL_ID,
  SHERPA_SESSIONS: process.env.SHERPA_SESSIONS_CHANNEL_ID,
} as const

export const ROLE_IDS = {
  // Sherpa Hub roles (to be configured)
  SHERPA: process.env.SHERPA_ROLE_ID,
  SHERPA_ADMIN: process.env.SHERPA_ADMIN_ROLE_ID,
  OATHKEEPER: process.env.OATHKEEPER_ROLE_ID,
} as const

/**
 * Check if a guild ID is a known community guild
 */
export function isKnownGuild(guildId: string): boolean {
  return Object.values(GUILD_IDS).includes(guildId as any)
}

/**
 * Get guild name from ID
 */
export function getGuildName(guildId: string): string {
  switch (guildId) {
    case GUILD_IDS.SHERPA_HUB:
      return "Sherpa Hub"
    case GUILD_IDS.JUPITERS_GIRTH:
      return "Jupiter's Girth"
    default:
      return "Unknown Guild"
  }
}
