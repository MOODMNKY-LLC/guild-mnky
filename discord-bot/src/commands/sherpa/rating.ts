/**
 * /sherpa rating Command Handler
 * Handles post-session rating submission
 */

import { ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaRating(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const sessionId = interaction.options.getString('session_id', true)

  // Verify user was a participant
  const profileId = await getProfileByDiscordId(interaction.user.id)
  if (!profileId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Profile Not Found',
          'Your profile could not be found.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Check if user was a participant
  const { data: participant } = await supabase
    .from('sherpa_session_participants')
    .select('session_id')
    .eq('session_id', sessionId)
    .eq('profile_id', profileId)
    .single()

  if (!participant) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Not a Participant',
          'You were not a participant in this session.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Check if already rated
  const { data: existingRating } = await supabase
    .from('sherpa_ratings')
    .select('id')
    .eq('session_id', sessionId)
    .eq('rater_profile_id', profileId)
    .single()

  if (existingRating) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Already Rated',
          'You have already submitted a rating for this session.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Create rating modal
  const modal = new ModalBuilder()
    .setCustomId(`sherpa_rating_modal_${sessionId}`)
    .setTitle('Rate Session')

  const ratingInput = new TextInputBuilder()
    .setCustomId('rating')
    .setLabel('Rating (1-5)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter a number from 1 to 5 (5 = Excellent)')
    .setRequired(true)
    .setMaxLength(1)

  const commentsInput = new TextInputBuilder()
    .setCustomId('comments')
    .setLabel('Comments (Optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('What did you think of the session?')
    .setRequired(false)
    .setMaxLength(1000)

  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ratingInput)
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(commentsInput)

  modal.addComponents(firstRow, secondRow)

  await interaction.showModal(modal)
}

/**
 * Handle rating modal submission
 */
export async function handleRatingModalSubmit(
  interaction: any, // ModalSubmitInteraction
  sessionId: string,
  communityId: string
) {
  const ratingStr = interaction.fields.getTextInputValue('rating')
  const comments = interaction.fields.getTextInputValue('comments') || null

  const rating = parseInt(ratingStr, 10)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Invalid Rating',
          'Rating must be a number between 1 and 5.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get session and Sherpa ID
  const { data: session } = await supabase
    .from('sherpa_sessions')
    .select('sherpa_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Session Not Found',
          'Session not found.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get rater profile
  const raterProfileId = await getProfileByDiscordId(interaction.user.id)
  if (!raterProfileId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Profile Not Found',
          'Your profile could not be found.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Create rating
  const { error: ratingError } = await supabase
    .from('sherpa_ratings')
    .insert({
      session_id: sessionId,
      rater_profile_id: raterProfileId,
      rated_sherpa_id: session.sherpa_id,
      rating,
      comments,
    })

  if (ratingError) {
    console.error('Error creating rating:', ratingError)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Rating Failed',
          'Failed to submit rating. Please try again.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Update Oathkeeper Score
  await supabase.rpc('update_sherpa_oathkeeper_score', {
    sherpa_uuid: session.sherpa_id,
  })

  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        'Rating Submitted',
        `Thank you for your feedback! Rating: **${rating}/5**`
      ),
    ],
    ephemeral: true,
  })
}
