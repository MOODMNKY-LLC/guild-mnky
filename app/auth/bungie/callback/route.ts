import { NextResponse } from 'next/server'
import { consumeState, exchangeCode, logAction, upsertLink } from '@/lib/bungie/auth'

type BungieTokenResponse = {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number | string
  refresh_expires_in?: number | string
  membership_id?: string | number
  membershipId?: string | number
  membership_type?: number | string
  membershipType?: number | string
  display_name?: string
  displayName?: string
  scope?: string | string[]
  scopes?: string | string[]
}

function errorRedirect(origin: string, error: string, message: string) {
  const errorUrl = new URL('/auth/error', origin)
  errorUrl.searchParams.set('error', error)
  errorUrl.searchParams.set('message', message)
  return NextResponse.redirect(errorUrl)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')

  if (error) {
    return errorRedirect(
      url.origin,
      'bungie_oauth_error',
      errorDescription ? `${error}: ${errorDescription}` : error
    )
  }

  if (!code || !state) {
    return errorRedirect(url.origin, 'bungie_oauth_missing_params', 'Missing Bungie OAuth code or state.')
  }

  let stateRow: { discord_user_id: string; return_to: string | null }
  try {
    stateRow = consumeState(state)
  } catch (stateError: unknown) {
    return errorRedirect(
      url.origin,
      'bungie_oauth_invalid_state',
      stateError instanceof Error ? stateError.message : 'Invalid Bungie OAuth state.'
    )
  }

  try {
    const token = (await exchangeCode(code)) as BungieTokenResponse
    const membershipId = token.membership_id || token.membershipId

    if (!membershipId) {
      throw new Error('Bungie token exchange did not return a membership id.')
    }

    const membershipTypeValue = token.membership_type ?? token.membershipType ?? null
    const bungieMembershipType =
      typeof membershipTypeValue === 'string' ? Number(membershipTypeValue) : membershipTypeValue

    upsertLink({
      discordUserId: stateRow.discord_user_id,
      bungieMembershipId: String(membershipId),
      bungieMembershipType: Number.isFinite(bungieMembershipType as number) ? Number(bungieMembershipType) : null,
      bungieDisplayName: token.display_name ?? token.displayName ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      tokenType: token.token_type || 'Bearer',
      tokenExpiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString(),
      refreshExpiresAt: token.refresh_expires_in
        ? new Date(Date.now() + Number(token.refresh_expires_in) * 1000).toISOString()
        : null,
      scopes: token.scope || token.scopes || null,
      consentGrantedAt: new Date().toISOString(),
    })

    logAction(stateRow.discord_user_id, 'oauth_callback', 'ok', { membershipId })

    const nextTarget = stateRow.return_to || '/protected/settings'
    const redirectUrl = new URL(nextTarget, url.origin)
    if (!redirectUrl.pathname.startsWith('/')) {
      return errorRedirect(url.origin, 'bungie_oauth_invalid_return', 'Invalid Bungie return target.')
    }

    return NextResponse.redirect(redirectUrl)
  } catch (callbackError: unknown) {
    const message = callbackError instanceof Error ? callbackError.message : 'Unknown Bungie OAuth error'
    logAction(stateRow.discord_user_id, 'oauth_callback', 'error', message)
    return errorRedirect(
      url.origin,
      'bungie_oauth_exchange_failed',
      callbackError instanceof Error ? callbackError.message : 'Unable to complete Bungie authorization.'
    )
  }
}
