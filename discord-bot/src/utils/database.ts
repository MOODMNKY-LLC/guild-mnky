/**
 * Database Utilities
 * Supabase client and helper functions for Discord bot
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { databaseLogger } from './logger.js'

// Lazy initialization of Supabase client
// This allows dotenv.config() to run before the client is created
let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    // Check for environment variables with helpful error message
    if (!process.env.SUPABASE_URL) {
      throw new Error('Missing SUPABASE_URL environment variable. Check your .env file.')
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Check your .env file.')
    }

    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  
  return supabaseClient
}

// Export proxy that lazily initializes the client
// This ensures dotenv.config() runs before Supabase client creation
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  },
})

/**
 * Get community UUID by Discord guild ID
 * Uses the get_community_by_guild_id database function
 */
export async function getCommunityByGuildId(guildId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_community_by_guild_id', {
    guild_id: guildId,
  })

  if (error) {
    databaseLogger.error({ error, guildId }, 'Error getting community by guild ID')
    return null
  }

  return data || null
}

/**
 * Get user's profile ID by Discord user ID
 */
export async function getProfileByDiscordId(discordUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('discord_user_id', discordUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}

/**
 * Get or create profile for Discord user
 * Returns profile ID
 */
export async function getOrCreateProfile(
  discordUserId: string,
  discordUsername: string,
  guildId: string
): Promise<string | null> {
  // Try to get existing profile
  const existingProfileId = await getProfileByDiscordId(discordUserId)
  if (existingProfileId) {
    return existingProfileId
  }

  // Get community for this guild
  const communityId = await getCommunityByGuildId(guildId)
  if (!communityId) {
    console.error(`No community found for guild ${guildId}`)
    return null
  }

  // Create profile (this would typically be done via auth trigger, but we can set community_id)
  // Note: Full profile creation requires auth context, so this is a placeholder
  // The actual implementation should use the auth system
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      discord_user_id: discordUserId,
      username: discordUsername,
      community_id: communityId,
      discord_guild_id: guildId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return data.id
}

/**
 * Verify Discord membership and update profile
 * Called when a user joins a guild
 */
export async function verifyDiscordMembership(
  discordUserId: string,
  guildId: string
): Promise<{ verified: boolean; profileId?: string; error?: string }> {
  try {
    // Get community for this guild
    const communityId = await getCommunityByGuildId(guildId)
    if (!communityId) {
      return { verified: false, error: 'Guild is not an anchor community' }
    }

    // Get or create profile
    const profileId = await getOrCreateProfile(discordUserId, 'Unknown', guildId)
    if (!profileId) {
      return { verified: false, error: 'Failed to get or create profile' }
    }

    // Update community_id and discord_guild_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        community_id: communityId,
        discord_guild_id: guildId,
      })
      .eq('id', profileId)

    if (updateError) {
      return { verified: false, error: updateError.message }
    }

    return { verified: true, profileId }
  } catch (error: any) {
    databaseLogger.error({ error, discordUserId, guildId }, 'Error in verifyDiscordMembership')
    return { verified: false, error: error.message }
  }
}

/**
 * Sync Discord roles for a user profile
 * Updates the profile's discord_role_ids and roles_synced_at timestamp
 * Called by guildMemberUpdate event handler
 */
export async function syncDiscordRoles(
  discordUserId: string,
  discordRoleIds: string[]
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    // Find profile by discord_user_id
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('discord_user_id', discordUserId)
      .single()

    if (findError || !profile) {
      databaseLogger.warn(
        { discordUserId, error: findError },
        'Profile not found when syncing roles - user may not have logged into web app yet'
      )
      return { success: false, error: `Profile not found for Discord user ${discordUserId}` }
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
      databaseLogger.error(
        { error: updateError, discordUserId, profileId: profile.id },
        'Failed to sync Discord roles to database'
      )
      return { success: false, error: `Failed to sync roles: ${updateError.message}` }
    }

    databaseLogger.debug(
      { discordUserId, profileId: profile.id, roleCount: discordRoleIds.length },
      'Successfully synced Discord roles to database'
    )

    return { success: true, profileId: profile.id }
  } catch (error: any) {
    databaseLogger.error({ error, discordUserId }, 'Error in syncDiscordRoles')
    return { success: false, error: error.message }
  }
}
