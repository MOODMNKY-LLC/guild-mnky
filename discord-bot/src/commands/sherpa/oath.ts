/**
 * /sherpa oath Command Handler
 * Displays Guardian Oath and handles acceptance
 */

import { ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createGuardianOathEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaOath(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  // Display Guardian Oath
  const embed = createGuardianOathEmbed()

  // Check if user is a Sherpa
  const profileId = await getProfileByDiscordId(interaction.user.id)
  if (profileId) {
    const { data: sherpa } = await supabase
      .from('sherpas')
      .select('id, oath_accepted')
      .eq('profile_id', profileId)
      .eq('community_id', communityId)
      .single()

    if (sherpa) {
      if (sherpa.oath_accepted) {
        embed.setFooter({ text: 'You have already accepted the Guardian Oath.' })
      } else {
        // Add "Accept Oath" button
        const acceptButton = new ButtonBuilder()
          .setCustomId(`sherpa_oath_accept_${sherpa.id}`)
          .setLabel('Accept Oath')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton)
        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        })
        return
      }
    }
  }

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  })
}

/**
 * Handle oath acceptance button click
 */
export async function handleOathAcceptance(
  interaction: any, // ButtonInteraction
  sherpaId: string,
  communityId: string
) {
  // Update Sherpa record
  const { error } = await supabase
    .from('sherpas')
    .update({
      oath_accepted: true,
      oath_accepted_at: new Date().toISOString(),
    })
    .eq('id', sherpaId)

  if (error) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Error',
          'Failed to accept oath. Please try again.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Assign Oathkeeper role (if configured)
  const oathkeeperRoleId = process.env.OATHKEEPER_ROLE_ID
  if (oathkeeperRoleId && interaction.member) {
    try {
      await interaction.member.roles.add(oathkeeperRoleId)
    } catch (error) {
      console.error('Error assigning Oathkeeper role:', error)
    }
  }

  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        'Oath Accepted',
        'You have accepted the Guardian Oath! You are now an Oathkeeper.'
      ),
    ],
    ephemeral: true,
  })
}
