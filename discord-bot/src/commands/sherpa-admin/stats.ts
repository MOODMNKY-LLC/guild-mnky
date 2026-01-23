/**
 * /sherpa-admin stats Command Handler
 * Displays Sherpa program statistics
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createInfoEmbed, createErrorEmbed } from '../../utils/embeds.js'

export async function handleSherpaAdminStats(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  // Check admin permissions
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Permission Denied',
          'This command requires Administrator permissions.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get statistics
  const [sherpasResult, applicationsResult, requestsResult, sessionsResult, ratingsResult] = await Promise.all([
    supabase
      .from('sherpas')
      .select('id, is_active, oathkeeper_score')
      .eq('community_id', communityId),
    supabase
      .from('sherpa_applications')
      .select('id, status')
      .eq('community_id', communityId),
    supabase
      .from('sherpa_requests')
      .select('id, status')
      .eq('community_id', communityId),
    supabase
      .from('sherpa_sessions')
      .select('id, status')
      .eq('community_id', communityId),
    supabase
      .from('sherpa_ratings')
      .select('rating'),
  ])

  const sherpas = sherpasResult.data || []
  const applications = applicationsResult.data || []
  const requests = requestsResult.data || []
  const sessions = sessionsResult.data || []
  const ratings = ratingsResult.data || []

  const activeSherpas = sherpas.filter(s => s.is_active).length
  const pendingApplications = applications.filter(a => a.status === 'pending').length
  const completedSessions = sessions.filter(s => s.status === 'completed').length
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(2)
    : '0.00'
  const avgOathkeeperScore = sherpas.length > 0
    ? (sherpas.reduce((sum, s) => sum + (s.oathkeeper_score || 0), 0) / sherpas.length).toFixed(2)
    : '0.00'

  const statsText = 
    `**Total Sherpas:** ${sherpas.length}\n` +
    `**Active Sherpas:** ${activeSherpas}\n` +
    `**Pending Applications:** ${pendingApplications}\n` +
    `**Total Requests:** ${requests.length}\n` +
    `**Completed Sessions:** ${completedSessions}\n` +
    `**Average Rating:** ${avgRating}/5\n` +
    `**Average Oathkeeper Score:** ${avgOathkeeperScore}/100`

  await interaction.reply({
    embeds: [
      createInfoEmbed(
        'Sherpa Program Statistics',
        statsText
      ),
    ],
    ephemeral: true,
  })
}
