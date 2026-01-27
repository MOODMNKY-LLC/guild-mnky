/**
 * Discord Role Assignment Utilities
 * 
 * Functions to assign Discord roles via Discord API
 * Used when approving Sherpa applications
 */

/**
 * Assign a Discord role to a user
 * 
 * @param discordUserId - Discord user ID
 * @param roleId - Discord role ID to assign
 * @param guildId - Discord guild/server ID
 * @returns Success status and any error message
 */
export async function assignDiscordRole(
  discordUserId: string,
  roleId: string,
  guildId: string
): Promise<{ success: boolean; error?: string }> {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

  if (!DISCORD_BOT_TOKEN) {
    return {
      success: false,
      error: 'DISCORD_BOT_TOKEN not configured',
    }
  }

  try {
    // Assign role via Discord API
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      
      // 204 No Content means success (Discord API returns 204 for role assignment)
      if (response.status === 204) {
        return { success: true }
      }

      // 404 might mean user not in guild or role doesn't exist
      if (response.status === 404) {
        return {
          success: false,
          error: `User or role not found in guild (404). User may not be in the server.`,
        }
      }

      // 403 Forbidden - permission issue
      if (response.status === 403) {
        const errorData = JSON.parse(errorText || '{}')
        let errorMsg = `Missing permissions (403). `
        
        if (errorData.code === 50001) {
          errorMsg += `Bot needs "Manage Roles" permission and bot's role must be higher than target role in hierarchy.`
        } else if (errorData.code === 50013) {
          errorMsg += `Bot lacks required permissions. Check bot has "Manage Roles" permission.`
        } else {
          errorMsg += errorData.message || 'Check bot permissions and role hierarchy.'
        }
        
        return {
          success: false,
          error: errorMsg,
        }
      }

      return {
        success: false,
        error: `Discord API error: ${response.status} ${errorText}`,
      }
    }

    // 204 No Content is success for role assignment
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error assigning role',
    }
  }
}

/**
 * Remove a Discord role from a user
 * 
 * @param discordUserId - Discord user ID
 * @param roleId - Discord role ID to remove
 * @param guildId - Discord guild/server ID
 * @returns Success status and any error message
 */
export async function removeDiscordRole(
  discordUserId: string,
  roleId: string,
  guildId: string
): Promise<{ success: boolean; error?: string }> {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

  if (!DISCORD_BOT_TOKEN) {
    return {
      success: false,
      error: 'DISCORD_BOT_TOKEN not configured',
    }
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Discord API error: ${response.status} ${errorText}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error removing role',
    }
  }
}

/**
 * Sync Discord role assignment to database
 * Updates the user's discord_role_ids array in profiles table
 * 
 * @param discordUserId - Discord user ID
 * @param roleId - Role ID to add/remove
 * @param add - If true, add role; if false, remove role
 * @returns Success status
 */
export async function syncRoleToDatabase(
  discordUserId: string,
  roleId: string,
  add: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/server')
    const supabase = await createClient()

    // Get current roles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('discord_role_ids')
      .eq('discord_user_id', discordUserId)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: `Profile not found for Discord user ${discordUserId}`,
      }
    }

    const currentRoles = profile.discord_role_ids || []
    let updatedRoles: string[]

    if (add) {
      // Add role if not already present
      updatedRoles = currentRoles.includes(roleId)
        ? currentRoles
        : [...currentRoles, roleId]
    } else {
      // Remove role
      updatedRoles = currentRoles.filter((id: string) => id !== roleId)
    }

    // Update database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        discord_role_ids: updatedRoles,
        roles_synced_at: new Date().toISOString(),
      })
      .eq('discord_user_id', discordUserId)

    if (updateError) {
      return {
        success: false,
        error: `Failed to update database: ${updateError.message}`,
      }
    }

    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error syncing role',
    }
  }
}
