import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthUrl } from '@/lib/bungie/auth'

function safeReturnTo(value: string | null, origin: string) {
  if (!value) return null
  try {
    if (value.startsWith('/')) return value
    const url = new URL(value, origin)
    return url.origin === origin ? url.toString() : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const returnTo = safeReturnTo(url.searchParams.get('return_to'), url.origin)

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/auth/login', url.origin)
      loginUrl.searchParams.set('error', 'bungie_login_required')
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.discord_user_id) {
      const errorUrl = new URL('/auth/error', url.origin)
      errorUrl.searchParams.set('error', 'bungie_missing_discord_id')
      errorUrl.searchParams.set(
        'message',
        'We could not find a Discord user ID for this account. Please sign out and back in with Discord.'
      )
      return NextResponse.redirect(errorUrl)
    }

    const { url: authUrl } = buildAuthUrl({
      discordUserId: profile.discord_user_id,
      returnTo,
    })

    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    const errorUrl = new URL('/auth/error', url.origin)
    errorUrl.searchParams.set('error', 'bungie_start_failed')
    errorUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Unable to start Bungie linking right now.'
    )
    return NextResponse.redirect(errorUrl)
  }
}
