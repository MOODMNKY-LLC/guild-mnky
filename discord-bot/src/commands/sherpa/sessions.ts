/**
 * /sherpa sessions Command Handler
 * Lists upcoming or past Sherpa sessions
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createInfoEmbed, createErrorEmbed } from '../../utils/embeds.js'

export async function handleSherpaSessions(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const filter = interaction.options.getString('filter', false) || 'upcoming'

  // Build query based on filter
  let query = supabase
    .from('sherpa_sessions')
    .select(`
      id,
      activity_type,
      activity_name,
      difficulty,
      scheduled_start,
      status,
      sherpas (
        profile_id,
        profiles (
          username
        )
      )
    `)
    .eq('community_id', communityId)
    .order('scheduled_start', { ascending: true })
    .limit(10)

  // Apply filter
  switch (filter) {
    case 'upcoming':
      query = query.in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_start', new Date().toISOString())
      break
    case 'past':
      query = query.in('status', ['completed', 'cancelled', 'abandoned', 'resigned'])
        .lt('scheduled_start', new Date().toISOString())
      break
    case 'my-sessions':
      // Filter by user's participation
      // Implementation requires joining with participants table
      break
    case 'all':
      // No additional filter
      break
  }

  const { data: sessions, error } = await query

  if (error) {
    console.error('Error fetching sessions:', error)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Error',
          'Failed to fetch sessions. Please try again later.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  if (!sessions || sessions.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          'No Sessions Found',
          `No sessions found matching filter: **${filter}**`
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Build session list embed
  const sessionList = sessions
    .map((session: any) => {
      const date = new Date(session.scheduled_start)
      return `**${session.activity_name || session.activity_type}**\n` +
        `📅 <t:${Math.floor(date.getTime() / 1000)}:F>\n` +
        `Status: ${session.status}\n` +
        `ID: \`${session.id}\``
    })
    .join('\n\n')

  await interaction.reply({
    embeds: [
      createInfoEmbed(
        `Sessions (${filter})`,
        sessionList.substring(0, 2000) // Discord embed limit
      ),
    ],
    ephemeral: true,
  })
}
