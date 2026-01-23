/**
 * /sherpa request Command Handler
 * Handles Seeker request creation
 */

import { ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSuccessEmbed, createErrorEmbed, createRequestEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaRequest(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const activityType = interaction.options.getString('activity', true)
  const difficulty = interaction.options.getString('difficulty', false)
  const scheduledTime = interaction.options.getString('scheduled_time', false)
  const notes = interaction.options.getString('notes', false)

  // Get user profile
  const profileId = await getProfileByDiscordId(interaction.user.id)
  if (!profileId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Profile Not Found',
          'Your profile could not be found. Please ensure you are logged into the web app first.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Create request record
  const { data: request, error } = await supabase
    .from('sherpa_requests')
    .insert({
      seeker_profile_id: profileId,
      community_id: communityId,
      activity_type: activityType,
      difficulty: difficulty || null,
      scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
      notes: notes || null,
      status: 'open',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating request:', error)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Request Failed',
          'Failed to create your request. Please try again later.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Send confirmation
  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        'Request Created',
        `Your request has been posted!\n\n**Request ID:** \`${request.id}\``
      ),
    ],
    ephemeral: true,
  })

  // Post to requests channel
  const requestsChannelId = process.env.SHERPA_REQUESTS_CHANNEL_ID
  if (requestsChannelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(requestsChannelId)
    if (channel && channel.isTextBased()) {
      const embed = createRequestEmbed({
        requestId: request.id,
        requesterName: interaction.user.tag,
        activityType,
        difficulty: difficulty || undefined,
        scheduledTime: scheduledTime || undefined,
        notes: notes || undefined,
      })

      // Add "Claim Request" button (Sherpas only)
      const claimButton = new ButtonBuilder()
        .setCustomId(`sherpa_request_claim_${request.id}`)
        .setLabel('Claim Request')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅')

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton)

      await channel.send({ embeds: [embed], components: [row] })
    }
  }
}
