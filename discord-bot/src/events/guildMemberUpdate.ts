/**
 * Guild Member Update Event Handler
 * Called when a Discord member's roles or other properties are updated
 * 
 * This handler syncs role changes to the database, including Linked Roles
 */

import { GuildMember } from 'discord.js'
import { syncDiscordRoles } from '../utils/database.js'
import { eventLogger } from '../utils/logger.js'

const VERIFIED_GUARDIAN_ROLE_ID = process.env.VERIFIED_GUARDIAN_ROLE_ID || process.env.NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID

export async function handleGuildMemberUpdate(oldMember: GuildMember, newMember: GuildMember) {
  try {
    // Check if roles changed
    const oldRoles = oldMember.roles.cache.map(role => role.id)
    const newRoles = newMember.roles.cache.map(role => role.id)

    // If roles haven't changed, skip
    if (oldRoles.length === newRoles.length && 
        oldRoles.every(roleId => newRoles.includes(roleId))) {
      return
    }

    eventLogger.info(
      {
        userId: newMember.user.id,
        userTag: newMember.user.tag,
        guildId: newMember.guild.id,
        oldRoles: oldRoles.length,
        newRoles: newRoles.length,
      },
      'Guild member roles updated'
    )

    // Check if Verified Guardian role was added
    const hasVerifiedGuardian = newRoles.includes(VERIFIED_GUARDIAN_ROLE_ID || '')
    const hadVerifiedGuardian = oldRoles.includes(VERIFIED_GUARDIAN_ROLE_ID || '')

    if (hasVerifiedGuardian && !hadVerifiedGuardian) {
      eventLogger.info(
        {
          userId: newMember.user.id,
          userTag: newMember.user.tag,
          guildId: newMember.guild.id,
        },
        'Verified Guardian role assigned'
      )
    }

    // Sync roles to database
    try {
      await syncDiscordRoles(newMember.user.id, newRoles)
      eventLogger.debug(
        {
          userId: newMember.user.id,
          roleCount: newRoles.length,
        },
        'Synced Discord roles to database'
      )
    } catch (error) {
      // Log error but don't throw - role sync failures shouldn't break Discord events
      eventLogger.error(
        {
          error,
          userId: newMember.user.id,
          guildId: newMember.guild.id,
        },
        'Failed to sync Discord roles to database'
      )
    }

  } catch (error) {
    eventLogger.error(
      {
        error,
        userId: newMember.user.id,
        guildId: newMember.guild.id,
      },
      'Error handling guild member update'
    )
  }
}
