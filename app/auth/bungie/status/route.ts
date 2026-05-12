import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLink } from '@/lib/bungie/auth'

function safeDiscordUserId(value: string | null) {
  if (!value) return null
  return /^\d+$/.test(value) ? value : null
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const discordUserIdParam = safeDiscordUserId(url.searchParams.get('discord_user_id'))

  try {
    let discordUserId = discordUserIdParam

    if (!discordUserId) {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ linked: false, error: 'unauthorized' }, { status: 401 })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_user_id')
        .eq('id', user.id)
        .single()

      discordUserId = safeDiscordUserId(profile?.discord_user_id ?? null)

      if (!discordUserId) {
        return NextResponse.json({ linked: false, error: 'discord_user_id_missing' }, { status: 400 })
      }
    }

    const link = getLink(discordUserId)

    if (!link) {
      return NextResponse.json({ linked: false, discord_user_id: discordUserId })
    }

    return NextResponse.json({
      linked: !link.revoked_at,
      discord_user_id: discordUserId,
      bungie_membership_id: link.bungie_membership_id,
      bungie_membership_type: link.bungie_membership_type,
      bungie_display_name: link.bungie_display_name,
      token_expires_at: link.token_expires_at,
      refresh_expires_at: link.refresh_expires_at,
      revoked_at: link.revoked_at,
      consent_granted_at: link.consent_granted_at,
      created_at: link.created_at,
      updated_at: link.updated_at,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        linked: false,
        error: error instanceof Error ? error.message : 'Unable to load Bungie link status.',
      },
      { status: 500 }
    )
  }
}
