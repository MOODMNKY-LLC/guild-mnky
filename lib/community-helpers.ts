/**
 * Community Helper Functions
 * 
 * Provides utilities for multi-community support, including user community assignment
 * and community lookup by Discord guild ID.
 */

import { createClient } from '@/lib/server'

/**
 * Get community UUID by Discord guild ID
 * @param guildId Discord guild ID to look up
 * @returns Community UUID or null if not found
 */
export async function getCommunityByGuildId(guildId: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('get_community_by_guild_id', { guild_id: guildId })
  
  if (error) {
    console.error('Error getting community by guild ID:', error)
    return null
  }
  
  // RPC function returns uuid, which is a string
  return (data as string | null) || null
}

/**
 * Get user's community with fallback logic
 * Priority:
 * 1. User's discord_guild_id -> community lookup
 * 2. User's existing community_id (if set)
 * 3. DEFAULT_ANCHOR_GUILD_ID env var -> community lookup
 * 4. Jupiter's Girth hard-coded fallback (backward compatibility)
 * 
 * @param userId User's profile ID (auth.users.id)
 * @returns Community UUID or null if no match found
 */
export async function getUserCommunity(userId: string): Promise<string | null> {
  const supabase = await createClient()
  
  // Try database function first (uses discord_guild_id or existing community_id)
  const { data: dbCommunityId, error: dbError } = await supabase
    .rpc('get_user_community', { user_profile_id: userId })
  
  if (!dbError && dbCommunityId) {
    return (dbCommunityId as string | null) || null
  }
  
  // Fallback: Get user's profile and check community_id directly
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('community_id, discord_guild_id')
    .eq('id', userId)
    .single()
  
  if (profileError) {
    console.error('Error getting user profile:', profileError)
  }
  
  // If user has community_id, return it
  if (profile?.community_id) {
    return profile.community_id
  }
  
  // If user has discord_guild_id, try to match to community
  if (profile?.discord_guild_id) {
    const matchedCommunity = await getCommunityByGuildId(profile.discord_guild_id)
    if (matchedCommunity) {
      return matchedCommunity
    }
  }
  
  // Fallback to DEFAULT_ANCHOR_GUILD_ID env var
  const defaultGuildId = process.env.DEFAULT_ANCHOR_GUILD_ID || '573823015511392268'
  const defaultCommunity = await getCommunityByGuildId(defaultGuildId)
  
  if (defaultCommunity) {
    return defaultCommunity
  }
  
  // Last resort: Hard-coded Jupiter's Girth (backward compatibility)
  return await getCommunityByGuildId('573823015511392268')
}

/**
 * Assign user to community based on Discord guild ID
 * Updates both community_id and discord_guild_id in profiles table
 * 
 * @param userId User's profile ID
 * @param guildId Discord guild ID to assign from
 * @returns Success status and community ID
 */
export async function assignUserToCommunityByGuild(
  userId: string,
  guildId: string
): Promise<{ success: boolean; communityId: string | null; error?: string }> {
  const supabase = await createClient()
  
  // Get community for this guild
  const communityId = await getCommunityByGuildId(guildId)
  
  if (!communityId) {
    return {
      success: false,
      communityId: null,
      error: `Guild ${guildId} is not an anchor community`
    }
  }
  
  // Update user's profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      community_id: communityId,
      discord_guild_id: guildId
    })
    .eq('id', userId)
  
  if (updateError) {
    return {
      success: false,
      communityId: null,
      error: updateError.message
    }
  }
  
  return {
    success: true,
    communityId
  }
}
