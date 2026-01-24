/**
 * Voice Join Command
 * Joins a voice channel and starts voice interaction session
 * Only one server can have an active voice session at a time
 * User must explicitly select which voice channel to join
 */

import { ChatInputCommandInteraction, ChannelType, PermissionFlagsBits } from "discord.js";
import { VoiceSession } from "../../discord/voiceSession.js";
import { botLogger } from "../../utils/logger.js";
import { getGuildName } from "../../config/constants.js";

// Store active voice session (only one session at a time across all servers)
let activeSession: { session: VoiceSession; guildId: string; guildName: string } | null = null;

export async function handleVoiceJoin(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  // Interaction should already be deferred by interactionCreate.ts
  // But check and defer if not already done (fallback)
  const alreadyDeferred = interaction.deferred || interaction.replied;

  if (!interaction.guild || !interaction.member) {
    const errorMsg = "❌ This command can only be used in a server.";
    if (alreadyDeferred) {
      await interaction.editReply({ content: errorMsg });
    } else {
      await interaction.reply({ content: errorMsg, ephemeral: true });
    }
    return;
  }

  try {
    // Get selected channel from command option
    const selectedChannel = interaction.options.getChannel("channel");

    if (!selectedChannel) {
      const errorMsg = "❌ Please select a voice channel to join.";
      if (alreadyDeferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
      return;
    }

    // Verify it's a voice channel
    if (
      selectedChannel.type !== ChannelType.GuildVoice &&
      selectedChannel.type !== ChannelType.GuildStageVoice
    ) {
      const errorMsg = "❌ Selected channel must be a voice channel.";
      if (alreadyDeferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
      return;
    }

    // Check bot permissions in the voice channel
    // Fetch the full channel object to get permissions
    const voiceChannel = await interaction.guild.channels.fetch(selectedChannel.id);
    
    if (voiceChannel && (voiceChannel.type === ChannelType.GuildVoice || voiceChannel.type === ChannelType.GuildStageVoice)) {
      const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
      const botPermissions = voiceChannel.permissionsFor(botMember);
      
      const requiredPermissions = [
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ];
      
      const missingPermissions: string[] = [];
      for (const permission of requiredPermissions) {
        if (!botPermissions?.has(permission)) {
          if (permission === PermissionFlagsBits.Connect) {
            missingPermissions.push("Connect");
          } else if (permission === PermissionFlagsBits.Speak) {
            missingPermissions.push("Speak");
          }
        }
      }
      
      if (missingPermissions.length > 0) {
        const errorMsg = `❌ Bot is missing required permissions in this voice channel: **${missingPermissions.join(", ")}**.\n\nPlease ensure the bot has:\n- **Connect** permission (to join the channel)\n- **Speak** permission (to play audio)`;
        
        botLogger.warn(
          {
            guildId: interaction.guild.id,
            channelId: selectedChannel.id,
            missingPermissions,
            botPermissions: botPermissions?.toArray() || [],
          },
          "Bot missing required voice channel permissions"
        );
        
        if (alreadyDeferred) {
          await interaction.editReply({ content: errorMsg });
        } else {
          await interaction.reply({ content: errorMsg, ephemeral: true });
        }
        return;
      }
      
      botLogger.info(
        {
          guildId: interaction.guild.id,
          channelId: selectedChannel.id,
          botPermissions: botPermissions?.toArray() || [],
        },
        "Bot permissions verified for voice channel"
      );
    } else {
      botLogger.warn(
        {
          guildId: interaction.guild.id,
          channelId: selectedChannel.id,
        },
        "Could not fetch voice channel for permission check, proceeding anyway"
      );
    }

    const currentGuildName = getGuildName(interaction.guild.id);

    // Check if there's an active session (reference project pattern: check before starting)
    const existingActiveSession = getActiveSession();
    
    // Check if there's an active session in another server
    if (existingActiveSession && existingActiveSession.guildId !== interaction.guild.id) {
      const busyMessage = `🔊 **GIRTH is currently assisting other Guardians** in **${existingActiveSession.guildName}**.\n\nPlease wait until they're finished, or ask someone in that server to use \`/voice leave\`.`;
      
      botLogger.info(
        {
          currentGuildId: interaction.guild.id,
          currentGuildName,
          activeGuildId: existingActiveSession.guildId,
          activeGuildName: existingActiveSession.guildName,
        },
        "Voice session already active in another server"
      );
      
      if (alreadyDeferred) {
        await interaction.editReply({ content: busyMessage });
      } else {
        await interaction.reply({ content: busyMessage, ephemeral: true });
      }
      return;
    }

    // Stop existing session in this guild if any (switching channels in same server)
    // Only stop if switching to a different channel - reuse if same channel
    if (existingActiveSession && existingActiveSession.guildId === interaction.guild.id) {
      const previousChannelId = existingActiveSession.session.opts.channelId;
      
      if (previousChannelId === selectedChannel.id) {
        // Same channel - don't recreate, just return success message
        botLogger.info(
          {
            guildId: interaction.guild.id,
            channelId: selectedChannel.id,
          },
          "Already connected to this channel, skipping recreation"
        );
        
        const successMessage = `✅ Already connected to **${selectedChannel.name}** in **${currentGuildName}**. Speak normally to interact!\n\nℹ️ Only one server can have an active voice session at a time.`;
        const truncatedMessage = successMessage.length > 2000 ? successMessage.substring(0, 1997) + "..." : successMessage;
        
        try {
          if (alreadyDeferred) {
            await interaction.editReply({ content: truncatedMessage });
          } else if (!interaction.replied) {
            await interaction.reply({ content: truncatedMessage, ephemeral: true });
          }
        } catch (replyError: any) {
          if (replyError.code !== 40060 && replyError.code !== 10062) {
            botLogger.error({ replyError }, "Failed to send reply");
          }
        }
        return; // Exit early - don't create new session
      }
      
      // Different channel - stop existing session
      botLogger.info(
        {
          guildId: interaction.guild.id,
          previousChannelId,
          newChannelId: selectedChannel.id,
        },
        "Stopping existing voice session in guild to start new one (different channel)"
      );

      existingActiveSession.session.stop();
      clearActiveSession();
      
      // Wait for connection cleanup to complete before creating new one
      // This prevents getVoiceConnection from returning a destroyed connection
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create new voice session
    const session = new VoiceSession({
      guildId: interaction.guild.id,
      channelId: selectedChannel.id,
      adapterCreator: interaction.guild.voiceAdapterCreator as any, // Type compatibility workaround
      communityId,
      allowedUserIds: [interaction.user.id], // Start with invoker-only
    });

    await session.start();

    // Store as active session (only one at a time)
    const newActiveSession = {
      session,
      guildId: interaction.guild.id,
      guildName: currentGuildName,
    };
    setActiveSession(newActiveSession);
    
    // Set up cleanup when session stops
    // Override the stop method to also clear active session
    const originalStop = session.stop.bind(session);
    session.stop = () => {
      originalStop();
      const currentActive = getActiveSession();
      if (currentActive && currentActive.session === session) {
        clearActiveSession();
      }
    };

    // Ensure message doesn't exceed Discord's 2000 character limit
    const successMessage = `✅ Joined **${selectedChannel.name}** in **${currentGuildName}**. Speak normally to interact! (Currently listening to you only)\n\nℹ️ Only one server can have an active voice session at a time.`;
    const truncatedMessage = successMessage.length > 2000 ? successMessage.substring(0, 1997) + "..." : successMessage;

    // Try to send success message, but don't fail if interaction expired
    try {
      if (alreadyDeferred) {
        await interaction.editReply({ content: truncatedMessage });
      } else if (!interaction.replied) {
        await interaction.reply({ content: truncatedMessage, ephemeral: true });
      }
    } catch (replyError: any) {
      // If interaction expired, log but don't fail - voice session started successfully
      if (replyError.code === 10062 || replyError.code === 40060) {
        botLogger.warn({ replyError }, "Interaction expired, but voice session started successfully");
      } else {
        throw replyError; // Re-throw other errors
      }
    }

    botLogger.info(
      {
        guildId: interaction.guild.id,
        guildName: currentGuildName,
        channelId: selectedChannel.id,
        channelName: selectedChannel.name,
        userId: interaction.user.id,
      },
      "Voice session started"
    );
  } catch (error: any) {
    botLogger.error({ 
      error: error?.message || error?.toString() || error,
      errorStack: error?.stack,
      guildId: interaction.guild.id 
    }, "Failed to join voice channel");

    // Truncate error message to avoid Discord's 2000 character limit
    const errorMessage = error?.message || error?.toString() || "Unknown error";
    const truncatedError = errorMessage.length > 500 ? errorMessage.substring(0, 497) + "..." : errorMessage;

    // Handle error reply based on interaction state
    try {
      if (alreadyDeferred) {
        await interaction.editReply({
          content: `❌ Failed to join voice channel: ${truncatedError}`,
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: `❌ Failed to join voice channel: ${truncatedError}`,
          ephemeral: true,
        });
      }
    } catch (replyError: any) {
      // Ignore "already acknowledged" and "unknown interaction" errors - interaction may have expired
      if (replyError.code !== 40060 && replyError.code !== 10062) {
        botLogger.error({ replyError }, "Failed to send error reply");
      }
    }
  }
}

// Export getter/setter functions for active session
export function getActiveSession() {
  return activeSession;
}

export function setActiveSession(session: typeof activeSession) {
  activeSession = session;
}

export function clearActiveSession() {
  activeSession = null;
}
