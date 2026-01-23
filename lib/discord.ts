/**
 * Discord Integration Utilities
 * 
 * This module provides functions for syncing Discord roles with Supabase profiles.
 * Used by Discord bot and server-side API routes.
 */

import { createClient } from '@/lib/server'

export interface DiscordMember {
  user: {
    id: string
    username: string
    discriminator: string
    avatar: string | null
  }
  roles: string[]
  nickname: string | null
}

/**
 * Sync Discord roles for a user profile
 * Updates the profile's discord_role_ids and roles_synced_at timestamp
 */
export async function syncDiscordRoles(
  discordUserId: string,
  discordRoleIds: string[]
) {
  const supabase = await createClient()
  
  // Find profile by discord_user_id
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id')
    .eq('discord_user_id', discordUserId)
    .single()

  if (findError || !profile) {
    throw new Error(`Profile not found for Discord user ${discordUserId}`)
  }

  // Update profile with new roles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      discord_role_ids: discordRoleIds,
      roles_synced_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (updateError) {
    throw new Error(`Failed to sync roles: ${updateError.message}`)
  }

  return { success: true, profileId: profile.id }
}

/**
 * Verify a Discord user is a member of the anchor guild
 * This should be called by the Discord bot when a user joins
 */
export async function verifyDiscordMembership(
  discordUserId: string,
  guildId: string
) {
  const supabase = await createClient()
  
  // Check if this guild is an anchor guild
  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('anchor_discord_guild_id', guildId)
    .single()

  if (!community) {
    return { verified: false, reason: 'Guild is not an anchor community' }
  }

  // Find or create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, community_id')
    .eq('discord_user_id', discordUserId)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(`Failed to check profile: ${profileError.message}`)
  }

  if (!profile) {
    // Profile will be created via auth trigger, but we can set community_id
    // This is a placeholder - actual implementation would need user auth context
    return { verified: true, needsProfile: true }
  }

  // Update community_id and discord_guild_id if not set or changed
  const updates: { community_id: string; discord_guild_id: string } = {
    community_id: community.id,
    discord_guild_id: guildId
  }

  // Only update if values have changed
  const needsUpdate = !profile.community_id || 
                      profile.community_id !== community.id ||
                      // Check if discord_guild_id needs updating (compare with current value)
                      true // Always update discord_guild_id to ensure it's set

  if (needsUpdate) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    if (updateError) {
      throw new Error(`Failed to update community: ${updateError.message}`)
    }
  }

  return { verified: true, profileId: profile.id }
}

/**
 * Get Discord bot configuration from integration_config
 */
export async function getDiscordBotConfig(communityId?: string) {
  const supabase = await createClient()
  
  const { data: config, error } = await supabase
    .from('integration_config')
    .select('config')
    .eq('provider', 'discord')
    .eq('community_id', communityId || null)
    .single()

  if (error) {
    return null
  }

  return config?.config as {
    bot_token?: string
    client_id?: string
    client_secret?: string
  } | null
}
