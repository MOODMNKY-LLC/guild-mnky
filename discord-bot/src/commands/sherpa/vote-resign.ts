/**
 * /sherpa vote-resign Command Handler
 * Handles vote to resign functionality
 */

import { ChatInputCommandInteraction } from 'discord.js'
import { supabase } from '../../utils/database.js'
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '../../utils/embeds.js'
import { getProfileByDiscordId } from '../../utils/database.js'

export async function handleSherpaVoteResign(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const sessionId = interaction.options.getString('session_id', true)

  // Verify user is a participant
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

  // Check if user is a participant
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
          'You are not a participant in this session.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Check if already voted
  const { data: existingVote } = await supabase
    .from('sherpa_session_votes')
    .select('id')
    .eq('session_id', sessionId)
    .eq('voter_profile_id', profileId)
    .single()

  if (existingVote) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Already Voted',
          'You have already voted to resign this session.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Create vote
  const { error: voteError } = await supabase
    .from('sherpa_session_votes')
    .insert({
      session_id: sessionId,
      voter_profile_id: profileId,
      vote_type: 'resign',
    })

  if (voteError) {
    console.error('Error creating vote:', voteError)
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'Vote Failed',
          'Failed to record your vote. Please try again.'
        ),
      ],
      ephemeral: true,
    })
    return
  }

  // Check if majority reached
  const { data: majorityReached } = await supabase.rpc('check_resignation_majority', {
    session_uuid: sessionId,
  })

  if (majorityReached) {
    // Update session status
    await supabase
      .from('sherpa_sessions')
      .update({
        status: 'resigned',
        resigned_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          'Session Resigned',
          'Majority vote reached! Session has been resigned by group consensus. No penalties applied.'
        ),
      ],
      ephemeral: true,
    })
  } else {
    // Get vote count
    const { data: votes } = await supabase
      .from('sherpa_session_votes')
      .select('id')
      .eq('session_id', sessionId)
      .eq('vote_type', 'resign')

    const { data: participantCount } = await supabase.rpc('get_session_participant_count', {
      session_uuid: sessionId,
    })

    await interaction.reply({
      embeds: [
        createInfoEmbed(
          'Vote Recorded',
          `Your vote has been recorded.\n\n` +
          `**Votes:** ${votes?.length || 0}/${participantCount || 0} participants\n` +
          `**Required:** ${Math.floor((participantCount || 0) / 2) + 1} votes`
        ),
      ],
      ephemeral: true,
    })
  }
}
