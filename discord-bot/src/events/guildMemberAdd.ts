/**
 * Guild Member Add Event Handler
 * Called when a user joins a Discord server
 */

import { GuildMember } from 'discord.js'
import { verifyDiscordMembership } from '../utils/database.js'
import { getGuildName } from '../config/constants.js'
import { createInfoEmbed } from '../utils/embeds.js'
import { eventLogger } from '../utils/logger.js'

export async function handleGuildMemberAdd(member: GuildMember) {
  try {
    eventLogger.info(
      {
        userId: member.user.id,
        userTag: member.user.tag,
        guildId: member.guild.id,
        guildName: member.guild.name,
      },
      'Guild member joined'
    )

    // Verify membership and update profile
    const result = await verifyDiscordMembership(member.user.id, member.guild.id)

    if (!result.verified) {
      console.error(`[GuildMemberAdd] Failed to verify membership for ${member.user.tag}:`, result.error)
      return
    }

    console.log(`[GuildMemberAdd] Successfully verified membership for ${member.user.tag}`)

    // Optional: Send welcome message to a welcome channel
    // This would require configuring a welcome channel ID
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID
    if (welcomeChannelId) {
      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId)
      if (welcomeChannel && welcomeChannel.isTextBased()) {
        const embed = createInfoEmbed(
          `Welcome to ${getGuildName(member.guild.id)}!`,
          `Welcome, ${member.user}! Your membership has been verified and you've been assigned to the community.`
        )
        await welcomeChannel.send({ embeds: [embed] })
      }
    }

    // Optional: Send DM welcome message
    try {
      const dmEmbed = createInfoEmbed(
        `Welcome to ${getGuildName(member.guild.id)}!`,
        `Thanks for joining! You've been automatically assigned to the community. ` +
        `Use \`/sherpa\` commands to get started with the Sherpa program.`
      )
      await member.send({ embeds: [dmEmbed] })
    } catch (error) {
      // User may have DMs disabled, ignore error
      eventLogger.debug(
        { userId: member.user.id, userTag: member.user.tag },
        'Could not send DM to new member (DMs may be disabled)'
      )
    }
  } catch (error) {
    eventLogger.error(
      {
        error,
        userId: member.user.id,
        guildId: member.guild.id,
      },
      'Error handling guild member add'
    )
  }
}
