/**
 * /sherpa-admin list Command Handler
 * Lists applications, requests, or sessions by status
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createInfoEmbed, createErrorEmbed } from '../../utils/embeds.js'

export async function handleSherpaAdminList(
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

  const status = interaction.options.getString('status', false) || 'pending'

  // Query applications
  let query = supabase
    .from('sherpa_applications')
    .select('id, status, created_at, profiles!inner(username)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: applications, error } = await query

  if (error) {
    console.error('Error fetching applications:', error)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Error',
          'Failed to fetch applications.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  if (!applications || applications.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          'No Applications',
          `No applications found with status: **${status}**`
        ),
      ],
      ephemeral: true,
    })
    return
  }

  const applicationList = applications
    .map((app: any) => {
      const date = new Date(app.created_at)
      const username = app.profiles?.username || 'Unknown'
      return `**${username}** - ${app.status}\n` +
        `ID: \`${app.id}\` | Created: <t:${Math.floor(date.getTime() / 1000)}:R>`
    })
    .join('\n\n')

  await interaction.reply({
    embeds: [
      createInfoEmbed(
        `Applications (${status})`,
        applicationList.substring(0, 2000)
      ),
    ],
    ephemeral: true,
  })
}
