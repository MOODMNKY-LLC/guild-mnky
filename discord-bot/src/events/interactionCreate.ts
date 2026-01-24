/**
 * Interaction Create Event Handler
 * Routes all Discord interactions (slash commands, buttons, modals) to appropriate handlers
 */

import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  Interaction,
} from 'discord.js'
import { getCommunityByGuildId } from '../utils/database.js'
import { isKnownGuild } from '../config/constants.js'

// Import command handlers
import { handleSherpaApply } from '../commands/sherpa/apply.js'
import { handleSherpaRequest } from '../commands/sherpa/request.js'
import { handleSherpaSessions } from '../commands/sherpa/sessions.js'
import { handleSherpaProfile } from '../commands/sherpa/profile.js'
import { handleSherpaOath } from '../commands/sherpa/oath.js'
import { handleSherpaRating } from '../commands/sherpa/rating.js'
import { handleSherpaVoteResign } from '../commands/sherpa/vote-resign.js'

// Import admin command handlers
import { handleSherpaAdminReview } from '../commands/sherpa-admin/review.js'
import { handleSherpaAdminList } from '../commands/sherpa-admin/list.js'
import { handleSherpaAdminStats } from '../commands/sherpa-admin/stats.js'

// Import voice command handlers
import { handleVoiceJoin } from '../commands/voice/join.js'
import { handleVoiceLeave } from '../commands/voice/leave.js'
import { handleVoiceStatus } from '../commands/voice/status.js'

// Import modal and button handlers
import { handleOathAcceptance } from '../commands/sherpa/oath.js'
import { handleApplicationModalSubmit } from '../commands/sherpa/apply.js'
import { handleRatingModalSubmit } from '../commands/sherpa/rating.js'

export async function handleInteractionCreate(interaction: Interaction) {
  // Only handle interactions in guilds (not DMs)
  if (!interaction.guildId || !interaction.guild) {
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: '❌ This bot only works in servers, not DMs.',
        ephemeral: true,
      })
    }
    return
  }

  // For slash commands, defer immediately to prevent timeout (3 seconds)
  // Do this BEFORE any async operations like database calls
  let interactionDeferred = false;
  if (interaction.isChatInputCommand()) {
    const cmdInteraction = interaction as ChatInputCommandInteraction;
    if (!cmdInteraction.deferred && !cmdInteraction.replied) {
      try {
        await cmdInteraction.deferReply({ ephemeral: true });
        interactionDeferred = true;
      } catch (deferError: any) {
        // If defer fails (interaction expired), continue anyway
        if (deferError.code !== 10062 && deferError.code !== 40060) {
          console.warn({ deferError }, 'Failed to defer interaction');
        }
      }
    }
  }

  // Check if this is a known guild
  if (!isKnownGuild(interaction.guildId)) {
    console.debug(`[InteractionCreate] Unknown guild ${interaction.guildId}, ignoring interaction`)
    if (interactionDeferred && interaction.isChatInputCommand()) {
      try {
        await (interaction as ChatInputCommandInteraction).editReply({ content: '❌ Unknown server.' });
      } catch {}
    }
    return
  }

  // Get community context
  const communityId = await getCommunityByGuildId(interaction.guildId)
  if (!communityId) {
    console.error(`[InteractionCreate] No community found for guild ${interaction.guildId}`)
    if (interactionDeferred && interaction.isChatInputCommand()) {
      try {
        await (interaction as ChatInputCommandInteraction).editReply({ content: '❌ This server is not configured as a community.' });
      } catch {}
    } else if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: '❌ This server is not configured as a community.',
        ephemeral: true,
      })
    }
    return
  }

  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleSlashCommand(interaction as ChatInputCommandInteraction, communityId)
      return
    }

    // Handle button interactions
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction as ButtonInteraction, communityId)
      return
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction as ModalSubmitInteraction, communityId)
      return
    }
  } catch (error) {
    console.error(
      {
        error,
        interactionType: interaction.type,
        guildId: interaction.guildId,
        userId: interaction.user?.id,
      },
      'Error handling interaction'
    )
    
    // Only reply if interaction hasn't been handled and isn't expired
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true,
        })
      } catch (replyError: any) {
        // Ignore "unknown interaction" and "already acknowledged" errors
        // These mean the interaction expired or was already handled
        if (replyError.code !== 10062 && replyError.code !== 40060) {
          console.error({ replyError }, 'Failed to send error reply')
        }
      }
    }
  }
}

/**
 * Handle slash commands
 */
async function handleSlashCommand(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const commandName = interaction.commandName
  const subcommandName = interaction.options.getSubcommand(false)

  // Route to appropriate command handler
  if (commandName === 'sherpa') {
    switch (subcommandName) {
      case 'apply':
        await handleSherpaApply(interaction, communityId)
        break
      case 'request':
        await handleSherpaRequest(interaction, communityId)
        break
      case 'sessions':
        await handleSherpaSessions(interaction, communityId)
        break
      case 'profile':
        await handleSherpaProfile(interaction, communityId)
        break
      case 'oath':
        await handleSherpaOath(interaction, communityId)
        break
      case 'rating':
        await handleSherpaRating(interaction, communityId)
        break
      case 'vote-resign':
        await handleSherpaVoteResign(interaction, communityId)
        break
      default:
        await interaction.reply({
          content: '❌ Unknown subcommand.',
          ephemeral: true,
        })
    }
  } else if (commandName === 'sherpa-admin') {
    switch (subcommandName) {
      case 'review':
        await handleSherpaAdminReview(interaction, communityId)
        break
      case 'list':
        await handleSherpaAdminList(interaction, communityId)
        break
      case 'stats':
        await handleSherpaAdminStats(interaction, communityId)
        break
      default:
        await interaction.reply({
          content: '❌ Unknown admin subcommand.',
          ephemeral: true,
        })
    }
  } else if (commandName === 'voice') {
    switch (subcommandName) {
      case 'join':
        await handleVoiceJoin(interaction, communityId)
        break
      case 'leave':
        await handleVoiceLeave(interaction, communityId)
        break
      case 'status':
        await handleVoiceStatus(interaction, communityId)
        break
      default:
        await interaction.reply({
          content: '❌ Unknown voice subcommand.',
          ephemeral: true,
        })
    }
  } else {
    await interaction.reply({
      content: '❌ Unknown command.',
      ephemeral: true,
    })
  }
}

/**
 * Handle button interactions
 */
async function handleButtonInteraction(
  interaction: ButtonInteraction,
  communityId: string
) {
  const customId = interaction.customId

  // Route button interactions based on customId prefix
  if (customId.startsWith('sherpa_oath_accept_')) {
    // Handle oath acceptance
    const sherpaId = customId.replace('sherpa_oath_accept_', '')
    await handleOathAcceptance(interaction, sherpaId, communityId)
  } else if (customId.startsWith('sherpa_request_claim_')) {
    // Handle request claim buttons
    // TODO: Implement request claiming
    await interaction.reply({
      content: '❌ Request claiming not yet implemented.',
      ephemeral: true,
    })
  } else {
    await interaction.reply({
      content: '❌ Unknown button interaction.',
      ephemeral: true,
    })
  }
}

/**
 * Handle modal submissions
 */
async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
  communityId: string
) {
  const customId = interaction.customId

  // Route modal submissions based on customId
  if (customId === 'sherpa_apply_modal') {
    // Handle application form submission
    await handleApplicationModalSubmit(interaction, communityId)
  } else if (customId.startsWith('sherpa_rating_modal_')) {
    // Handle rating form submission
    const sessionId = customId.replace('sherpa_rating_modal_', '')
    await handleRatingModalSubmit(interaction, sessionId, communityId)
  } else {
    await interaction.reply({
      content: '❌ Unknown modal submission.',
      ephemeral: true,
    })
  }
}
