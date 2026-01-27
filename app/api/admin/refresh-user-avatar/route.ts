/**
 * API Route: Refresh User Avatar (Admin)
 *
 * Fetches Discord user info for a given profile and updates avatar_url (and username/full_name).
 * Admin/officer only. Use when an applicant's avatar is missing but they have discord_user_id.
 */

import { createClient } from '@/lib/server'
import { getAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'officer')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or Officer access required' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const profileId = typeof body?.profileId === 'string' ? body.profileId.trim() : null
    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400 }
      )
    }

    const adminSupabase = getAdminClient()
    const { data: profileRow, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, discord_user_id, avatar_url, username, full_name')
      .eq('id', profileId)
      .single()

    if (profileError || !profileRow) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profile = profileRow as { id: string; discord_user_id: string | null; avatar_url: string | null; username: string | null; full_name: string | null }
    if (!profile.discord_user_id) {
      return NextResponse.json(
        { error: 'Profile has no Discord user ID; cannot refresh avatar.' },
        { status: 400 }
      )
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Discord bot token not configured' },
        { status: 500 }
      )
    }

    const discordResponse = await fetch(
      `https://discord.com/api/v10/users/${profile.discord_user_id}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      return NextResponse.json(
        { error: `Discord API error: ${discordResponse.status} ${errorText}` },
        { status: discordResponse.status }
      )
    }

    const discordUser = await discordResponse.json()
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${discordUser.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(String(discordUser.discriminator ?? '0'), 10) % 5}.png`
    const discordUsername = discordUser.username || discordUser.global_name
    const discordDisplayName = discordUser.global_name || discordUser.username

    const updateData: { avatar_url?: string; username?: string; full_name?: string } = {}
    if (avatarUrl && (!profile.avatar_url || profile.avatar_url !== avatarUrl)) {
      updateData.avatar_url = avatarUrl
    }
    if (discordUsername && (!profile.username || profile.username !== discordUsername)) {
      updateData.username = discordUsername
    }
    if (discordDisplayName && (!profile.full_name || profile.full_name !== discordDisplayName)) {
      updateData.full_name = discordDisplayName
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Profile already up to date',
        profile: { avatar_url: profile.avatar_url, username: profile.username, full_name: profile.full_name },
      })
    }

    const { error: updateError } = await adminSupabase
      .from('profiles')
      // @ts-expect-error - admin client generated types may not include profiles update
      .update(updateData)
      .eq('id', profileId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update profile: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updated: updateData,
      profile: {
        avatar_url: updateData.avatar_url ?? profile.avatar_url,
        username: updateData.username ?? profile.username,
        full_name: updateData.full_name ?? profile.full_name,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error refreshing user avatar:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
