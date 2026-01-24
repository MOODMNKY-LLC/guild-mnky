/**
 * Voice Leave Command
 * Leaves the voice channel and stops voice interaction session
 */

import { ChatInputCommandInteraction } from "discord.js";
import { sessions } from "./join.js";
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

  const session = sessions.get(interaction.guild.id);

  if (!session) {
    await interaction.reply({
      content: "❌ No active voice session in this server. Use `/voice join` first.",
      ephemeral: true,
    });
    return;
  }

  try {
    session.stop();
    sessions.delete(interaction.guild.id);

    const currentGuildName = getGuildName(interaction.guild.id);

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
