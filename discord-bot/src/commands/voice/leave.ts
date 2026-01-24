/**
 * Voice Leave Command
 * Leaves the voice channel and stops voice interaction session
 */

import { ChatInputCommandInteraction } from "discord.js";
import { getActiveSession, clearActiveSession } from "./join.js";
import { botLogger } from "../../utils/logger.js";
import { getGuildName } from "../../config/constants.js";

export async function handleVoiceLeave(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "❌ This command can only be used in a server.",
      ephemeral: true,
    });
    return;
  }

  const activeSession = getActiveSession();

  if (!activeSession) {
    await interaction.reply({
      content: "❌ No active voice session. Use `/voice join` first.",
      ephemeral: true,
    });
    return;
  }

  // Check if the active session is in this server
  if (activeSession.guildId !== interaction.guild.id) {
    const currentGuildName = getGuildName(interaction.guild.id);
    await interaction.reply({
      content: `❌ Active voice session is in **${activeSession.guildName}**, not **${currentGuildName}**.\n\nUse \`/voice join\` in **${activeSession.guildName}** to switch servers, or ask someone in that server to use \`/voice leave\`.`,
      ephemeral: true,
    });
    return;
  }

  try {
    activeSession.session.stop();
    const currentGuildName = getGuildName(interaction.guild.id);
    
    // Clear active session
    clearActiveSession();

    await interaction.reply({
      content: `✅ Left voice channel in **${currentGuildName}**.`,
      ephemeral: true,
    });

    botLogger.info({ guildId: interaction.guild.id }, "Voice session stopped");
  } catch (error: any) {
    botLogger.error({ error, guildId: interaction.guild.id }, "Error stopping voice session");

    await interaction.reply({
      content: `❌ Error stopping voice session: ${error.message || "Unknown error"}`,
      ephemeral: true,
    });
  }
}
