/**
 * API Route: Sync Discord Roles
 * 
 * Manually syncs Discord roles for the current user
 * Useful when Linked Roles are claimed but not synced to database
 * 
 * Also updates discord_user_id if missing (for existing users)
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

    // Get user's profile with Discord user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_user_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    let discordUserId = profile.discord_user_id

    // If discord_user_id is missing, try to extract it from auth.identities
    if (!discordUserId) {
      // Use service role client to access auth.identities
      const { data: { session } } = await supabase.auth.getSession()
      
      // Try to get from user metadata first
      discordUserId = user.user_metadata?.provider_id || 
                     user.user_metadata?.sub ||
                     user.user_metadata?.id

      // If still not found, we need to query auth.identities via admin API
      // For now, return error asking user to re-authenticate
      if (!discordUserId) {
        return NextResponse.json(
          { 
            error: 'Discord user ID not found. Please sign out and sign in again with Discord to link your account.',
            needsReauth: true
          },
          { status: 400 }
        )
      }

      // Update profile with found Discord user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ discord_user_id: discordUserId })
        .eq('id', user.id)

      if (updateError) {
        console.error('Failed to update discord_user_id:', updateError)
      }
    }

    // Fetch roles from Discord API
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
    const GUILD_ID = process.env.SHERPA_HUB_GUILD_ID || '1291190711919837234'

    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Discord bot token not configured' },
        { status: 500 }
      )
    }

    // Get member's roles from Discord
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordUserId}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!memberResponse.ok) {
      const errorText = await memberResponse.text()
      return NextResponse.json(
        { error: `Discord API error: ${memberResponse.status} ${errorText}` },
        { status: memberResponse.status }
      )
    }

    const member = await memberResponse.json()
    const roleIds = member.roles || []

    // Update profile with synced roles
    const updateData: { discord_role_ids: string[], roles_synced_at: string, discord_user_id?: string } = {
      discord_role_ids: roleIds,
      roles_synced_at: new Date().toISOString(),
    }

    // Only update discord_user_id if it was missing
    if (!profile.discord_user_id && discordUserId) {
      updateData.discord_user_id = discordUserId
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to sync roles: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Trim to avoid newline/whitespace from env (e.g. Vercel CLI "Value contains newlines")
    const expectedVerifiedRoleId = (process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID || '').trim()
    const hasVerifiedGuardian = expectedVerifiedRoleId
      ? roleIds.some((id: string) => String(id).trim() === expectedVerifiedRoleId)
      : true // Backward compatibility: when not configured, treat as verified

    return NextResponse.json({
      success: true,
      rolesSynced: roleIds.length,
      hasVerifiedGuardian,
      verificationConfigured: !!expectedVerifiedRoleId,
      roles: roleIds,
      discordUserId, // Return for debugging
      wasMissing: !profile.discord_user_id, // Indicate if we had to extract it
    })

  } catch (error: any) {
    console.error('Error syncing Discord roles:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
