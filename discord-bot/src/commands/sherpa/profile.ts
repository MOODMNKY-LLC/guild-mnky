/**
 * /sherpa profile Command Handler
 * Displays Sherpa profile and statistics
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSherpaEmbed, createErrorEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaProfile(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const targetUser = interaction.options.getUser('user', false) || interaction.user

  // Get target user's profile
  const profileId = await getProfileByDiscordId(targetUser.id)
  if (!profileId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Profile Not Found',
          'This user does not have a profile.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get Sherpa profile
  const { data: sherpa, error } = await supabase
    .from('sherpas')
    .select(`
      *,
      profiles (
        username
      )
    `)
    .eq('profile_id', profileId)
    .eq('community_id', communityId)
    .single()

  if (error || !sherpa) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Not a Sherpa',
          'This user is not a registered Sherpa.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get statistics
  const { data: stats } = await supabase
    .from('sherpa_sessions')
    .select('id, status')
    .eq('sherpa_id', sherpa.id)

  const completedSessions = stats?.filter(s => s.status === 'completed').length || 0
  const totalSessions = stats?.length || 0

  // Build profile embed
  const embed = createSherpaEmbed(
    `${targetUser.tag}'s Sherpa Profile`,
    `**Oathkeeper Score:** ${sherpa.oathkeeper_score.toFixed(2)}/100\n` +
    `**Sessions Completed:** ${completedSessions}/${totalSessions}\n` +
    `**Seekers Helped:** ${sherpa.total_seekers_helped}\n` +
    `**Specialties:** ${sherpa.specialties}\n` +
    `**Status:** ${sherpa.is_active ? 'Active' : 'Inactive'}`
  )

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  })
}
