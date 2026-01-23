/**
 * /sherpa apply Command Handler
 * Handles Sherpa application submission via modal form
 */

import { ChatInputCommandInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

/**
 * Handle /sherpa apply command
 * Shows modal form for application submission
 */
export async function handleSherpaApply(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  // Check if user already has an application
  const profileId = await getProfileByDiscordId(interaction.user.id)
  if (profileId) {
    const { data: existingApplication } = await supabase
      .from('sherpa_applications')
      .select('id, status')
      .eq('profile_id', profileId)
      .eq('community_id', communityId)
      .single()

    if (existingApplication) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Application Already Exists',
            `You already have an application with status: **${existingApplication.status}**.\n` +
            `Application ID: \`${existingApplication.id}\``
          ),
        ],
        ephemeral: true,
      })
      return
    }
  }

  // Create modal form
  const modal = new ModalBuilder()
    .setCustomId('sherpa_apply_modal')
    .setTitle('Sherpa Application')

  // Experience Level field
  const experienceInput = new TextInputBuilder()
    .setCustomId('experience_level')
    .setLabel('Experience Level')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 1000+ hours, multiple raid clears')
    .setRequired(true)
    .setMaxLength(200)

  // Specialties field
  const specialtiesInput = new TextInputBuilder()
    .setCustomId('specialties')
    .setLabel('Specialties')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Raids, Dungeons, PvP')
    .setRequired(true)
    .setMaxLength(200)

  // Availability field
  const availabilityInput = new TextInputBuilder()
    .setCustomId('availability')
    .setLabel('Availability')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Weekends 2-8 PM EST')
    .setRequired(true)
    .setMaxLength(200)

  // Motivation field (paragraph)
  const motivationInput = new TextInputBuilder()
    .setCustomId('motivation')
    .setLabel('Why do you want to be a Sherpa?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell us about your teaching philosophy...')
    .setRequired(true)
    .setMaxLength(1000)

  // Discord Username field
  const discordUsernameInput = new TextInputBuilder()
    .setCustomId('discord_username')
    .setLabel('Discord Username')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Your Discord username#1234')
    .setRequired(true)
    .setMaxLength(100)

  // Add inputs to modal
  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput)
  const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(specialtiesInput)
  const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(availabilityInput)
  const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(motivationInput)
  const fifthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(discordUsernameInput)

  modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow)

  // Show modal
  await interaction.showModal(modal)
}

/**
 * Handle application modal submission
 * Called from interactionCreate handler when modal is submitted
 */
export async function handleApplicationModalSubmit(
  interaction: any, // ModalSubmitInteraction
  communityId: string
) {
  // Get form values
  const experienceLevel = interaction.fields.getTextInputValue('experience_level')
  const specialties = interaction.fields.getTextInputValue('specialties')
  const availability = interaction.fields.getTextInputValue('availability')
  const motivation = interaction.fields.getTextInputValue('motivation')
  const discordUsername = interaction.fields.getTextInputValue('discord_username')

  // Get or create profile
  let profileId = await getProfileByDiscordId(interaction.user.id)
  if (!profileId) {
    // Profile should exist, but create placeholder if needed
    // In production, this should be handled by auth system
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

  // Create application record
  const { data: application, error } = await supabase
    .from('sherpa_applications')
    .insert({
      profile_id: profileId,
      community_id: communityId,
      experience_level: experienceLevel,
      specialties: specialties,
      availability: availability,
      motivation: motivation,
      discord_username: discordUsername,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating application:', error)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Application Failed',
          'Failed to submit your application. Please try again later.'
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
        'Application Submitted',
        `Your application has been submitted successfully!\n\n` +
        `**Application ID:** \`${application.id}\`\n` +
        `An admin will review your application soon.`
      ),
    ],
    ephemeral: true,
  })

  // Post to applications channel (if configured)
  const applicationsChannelId = process.env.SHERPA_APPLICATIONS_CHANNEL_ID
  if (applicationsChannelId && interaction.guild) {
    const channel = interaction.guild.channels.cache.get(applicationsChannelId)
    if (channel && channel.isTextBased()) {
      // Import embed builder
      const { createApplicationEmbed } = await import('../../utils/embeds.js')
      
      const embed = createApplicationEmbed({
        applicationId: application.id,
        applicantName: interaction.user.tag,
        experienceLevel,
        specialties,
        availability,
        motivation,
        discordUsername,
      })

      // Add action buttons for admin review
      // Implementation will be added when button handlers are complete

      await channel.send({ embeds: [embed] })
    }
  }
}
