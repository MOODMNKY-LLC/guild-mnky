/**
 * Embed Builders
 * Utility functions for creating rich Discord embeds
 */

import { EmbedBuilder, ColorResolvable } from 'discord.js'

const COLORS = {
  SUCCESS: 0x00ff00 as ColorResolvable,
  ERROR: 0xff0000 as ColorResolvable,
  WARNING: 0xffff00 as ColorResolvable,
  INFO: 0x0099ff as ColorResolvable,
  SHERPA: 0x9b59b6 as ColorResolvable, // Purple theme for Sherpa Hub
} as const

/**
 * Create a success embed
 */
export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp()
}

/**
 * Create an error embed
 */
export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp()
}

/**
 * Create an info embed
 */
export function createInfoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp()
}

/**
 * Create a Sherpa-themed embed
 */
export function createSherpaEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SHERPA)
    .setTitle(`🎓 ${title}`)
    .setDescription(description)
    .setTimestamp()
}

/**
 * Create Guardian Oath embed
 */
export function createGuardianOathEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SHERPA)
    .setTitle('🛡️ Guardian Oath')
    .setDescription(
      'By accepting this oath, you commit to these principles:\n\n' +
      '**1. Nurture Kindness**\n' +
      'Treat all players with respect and patience.\n\n' +
      '**2. Share The Light**\n' +
      'Share knowledge and help others grow.\n\n' +
      '**3. Honor Others**\n' +
      'Recognize and appreciate contributions.\n\n' +
      '**4. Stand Together**\n' +
      'Commit to completing sessions or voting to resign.'
    )
    .setFooter({ text: 'Accepting this oath is required before participating in sessions.' })
}

/**
 * Create application embed for admin review
 */
export function createApplicationEmbed(data: {
  applicationId: string
  applicantName: string
  experienceLevel: string
  specialties: string
  availability: string
  motivation: string
  discordUsername: string
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('📝 New Sherpa Application')
    .setDescription(`Application ID: \`${data.applicationId}\``)
    .addFields(
      { name: '👤 Applicant', value: data.applicantName, inline: true },
      { name: '📋 Discord', value: data.discordUsername, inline: true },
      { name: '💼 Experience', value: data.experienceLevel, inline: false },
      { name: '🎯 Specialties', value: data.specialties, inline: false },
      { name: '⏰ Availability', value: data.availability, inline: false },
      { name: '💭 Motivation', value: data.motivation.substring(0, 1000), inline: false }
    )
    .setTimestamp()
}

/**
 * Create request embed
 */
export function createRequestEmbed(data: {
  requestId: string
  requesterName: string
  activityType: string
  difficulty?: string
  scheduledTime?: string
  notes?: string
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.SHERPA)
    .setTitle('🎯 New Sherpa Request')
    .setDescription(`Request ID: \`${data.requestId}\``)
    .addFields(
      { name: '👤 Requester', value: data.requesterName, inline: true },
      { name: '🎮 Activity', value: data.activityType, inline: true }
    )
    .setTimestamp()

  if (data.difficulty) {
    embed.addFields({ name: '⚔️ Difficulty', value: data.difficulty, inline: true })
  }

  if (data.scheduledTime) {
    embed.addFields({ name: '📅 Scheduled Time', value: `<t:${Math.floor(new Date(data.scheduledTime).getTime() / 1000)}:F>`, inline: false })
  }

  if (data.notes) {
    embed.addFields({ name: '📝 Notes', value: data.notes.substring(0, 1000), inline: false })
  }

  return embed
}
