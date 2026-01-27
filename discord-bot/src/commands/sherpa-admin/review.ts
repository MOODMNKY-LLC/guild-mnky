/**
 * /sherpa-admin review Command Handler
 * Handles application review and approval/denial
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaAdminReview(
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

  const applicationId = interaction.options.getString('application_id', true)
  const action = interaction.options.getString('action', true) as 'approve' | 'deny'
  const reason = interaction.options.getString('reason', false) || null

  // Get application
  const { data: application, error: appError } = await supabase
    .from('sherpa_applications')
    .select(`
      *,
      profiles (
        discord_user_id
      )
    `)
    .eq('id', applicationId)
    .eq('community_id', communityId)
    .single()

  if (appError || !application) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Application Not Found',
          'Application not found or does not belong to this community.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Get admin profile
  const adminProfileId = await getProfileByDiscordId(interaction.user.id)
  if (!adminProfileId) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Profile Not Found',
          'Your admin profile could not be found.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Update application status
  const { error: updateError } = await supabase
    .from('sherpa_applications')
    .update({
      status: action === 'approve' ? 'approved' : 'denied',
      reviewed_by: adminProfileId,
      reviewed_at: new Date().toISOString(),
      review_reason: reason,
    })
    .eq('id', applicationId)

  if (updateError) {
    console.error('Error updating application:', updateError)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Review Failed',
          'Failed to update application status.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // If approved, create Sherpa record
  if (action === 'approve') {
    const { error: sherpaError } = await supabase
      .from('sherpas')
      .insert({
        profile_id: application.profile_id,
        community_id: communityId,
        application_id: applicationId,
        specialties: application.specialties,
        availability: application.availability,
        is_active: true,
        status: 'active',
      })

    if (sherpaError) {
      console.error('Error creating Sherpa record:', sherpaError)
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'Approval Failed',
            'Application approved but failed to create Sherpa record. Please check logs.'
          ),
        ],
        ephemeral: true,
      })
      return
    }

    // Assign Sherpa role (if configured)
    const sherpaRoleId = process.env.SHERPA_ROLE_ID
    if (sherpaRoleId && interaction.guild && application.profiles) {
      try {
        const discordUserId = (application.profiles as any).discord_user_id
        if (!discordUserId) {
          console.warn('Discord user ID not found in profile - skipping role assignment')
        } else {
          const member = await interaction.guild.members.fetch(discordUserId)
          await member.roles.add(sherpaRoleId)
          
          // Sync role to database
          const { syncDiscordRoles } = await import('../../utils/database.js')
          const currentRoles = member.roles.cache.map(role => role.id)
          await syncDiscordRoles(discordUserId, currentRoles)
          
          console.log(`✅ Assigned Sherpa role to ${member.user.tag} (${discordUserId})`)
        }
      } catch (error: any) {
        console.error('Error assigning Sherpa role:', error)
        // Don't fail the approval if role assignment fails
      }
    }
  }

  // Send DM to applicant
  try {
    const discordUserId = application.profiles ? (application.profiles as any).discord_user_id : null
    if (!discordUserId) {
      throw new Error('Discord user ID not found')
    }
    const applicant = await interaction.client.users.fetch(discordUserId)
    const dmEmbed = action === 'approve'
      ? createSuccessEmbed(
          'Application Approved',
          `Your Sherpa application has been approved!\n\n` +
          `**Reason:** ${reason || 'No reason provided'}\n\n` +
          `You are now a registered Sherpa. Use \`/sherpa\` commands to get started!`
        )
      : createErrorEmbed(
          'Application Denied',
          `Your Sherpa application has been denied.\n\n` +
          `**Reason:** ${reason || 'No reason provided'}`
        )

    await applicant.send({ embeds: [dmEmbed] })
  } catch (error) {
    console.error('Error sending DM to applicant:', error)
  }

  await interaction.reply({
    embeds: [
      createSuccessEmbed(
        `Application ${action === 'approve' ? 'Approved' : 'Denied'}`,
        `Application ${action === 'approve' ? 'approved' : 'denied'} successfully. Applicant has been notified.`
      ),
    ],
    ephemeral: true,
  })
}
