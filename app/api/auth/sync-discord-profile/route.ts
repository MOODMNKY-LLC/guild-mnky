/**
 * API Route: Sync Discord Profile Data
 * 
 * Fetches Discord user info and updates profile with avatar/username
 * Useful for backfilling missing Discord profile data
 */

import { createClient } from '@/lib/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_user_id, avatar_url, username, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    if (!profile.discord_user_id) {
      return NextResponse.json(
        { error: 'Discord user ID not found. Please sign out and sign back in with Discord.' },
        { status: 400 }
      )
    }

    // Fetch Discord user info
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
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
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
    
    // Build avatar URL (Discord CDN)
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${discordUser.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator) % 5}.png`

    const discordUsername = discordUser.username || discordUser.global_name
    const discordDisplayName = discordUser.global_name || discordUser.username

    // Update profile
    const updateData: {
      avatar_url?: string
      username?: string
      full_name?: string
    } = {}

    // Only update if missing or different
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
        profile: {
          avatar_url: profile.avatar_url,
          username: profile.username,
          full_name: profile.full_name,
        },
      })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

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
        avatar_url: updateData.avatar_url || profile.avatar_url,
        username: updateData.username || profile.username,
        full_name: updateData.full_name || profile.full_name,
      },
    })

  } catch (error: any) {
    console.error('Error syncing Discord profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
