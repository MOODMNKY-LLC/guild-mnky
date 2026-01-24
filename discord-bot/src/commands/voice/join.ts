/**
 * Voice Join Command
 * Joins a voice channel and starts voice interaction session
 * Multiple servers can have voice sessions simultaneously
 * User must explicitly select which voice channel to join
 */

import { ChatInputCommandInteraction, ChannelType } from "discord.js";
import { VoiceSession } from "../../discord/voiceSession.js";
import { botLogger } from "../../utils/logger.js";
import { getGuildName } from "../../config/constants.js";

// Store active voice sessions per guild (multiple servers can have sessions)
const sessions = new Map<string, VoiceSession>();

export async function handleVoiceJoin(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  try {
    // Get selected channel from command option
    const selectedChannel = interaction.options.getChannel("channel");

    if (!selectedChannel) {
      await interaction.reply({
        content: "❌ Please select a voice channel to join.",
        ephemeral: true,
      });
      return;
    }

    // Verify it's a voice channel
    if (
      selectedChannel.type !== ChannelType.GuildVoice &&
      selectedChannel.type !== ChannelType.GuildStageVoice
    ) {
      await interaction.reply({
        content: "❌ Selected channel must be a voice channel.",
        ephemeral: true,
      });
      return;
    }

    const currentGuildName = getGuildName(interaction.guild.id);

    // Stop existing session in this guild if any (only one session per guild)
    const existingSession = sessions.get(interaction.guild.id);
    if (existingSession) {
      botLogger.info(
        {
          guildId: interaction.guild.id,
          previousChannelId: existingSession.opts.channelId,
          newChannelId: selectedChannel.id,
        },
        "Stopping existing voice session in guild to start new one"
      );

      existingSession.stop();
      sessions.delete(interaction.guild.id);
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

    // Store session for this guild
    sessions.set(interaction.guild.id, session);

    await interaction.reply({
      content: `✅ Joined **${selectedChannel.name}** in **${currentGuildName}**. Speak normally to interact! (Currently listening to you only)\n\nℹ️ Multiple servers can have voice sessions simultaneously.`,
      ephemeral: true,
    });

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
    botLogger.error({ error, guildId: interaction.guild.id }, "Failed to join voice channel");

    await interaction.reply({
      content: `❌ Failed to join voice channel: ${error.message || "Unknown error"}`,
      ephemeral: true,
    });
  }
}

// Export sessions map for leave command and status
export { sessions };
