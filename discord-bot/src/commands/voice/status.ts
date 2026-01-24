/**
 * Voice Status Command
 * Shows which servers currently have active voice sessions
 */

import { ChatInputCommandInteraction } from "discord.js";
import { sessions } from "./join.js";
import { getGuildName } from "../../config/constants.js";

export async function handleVoiceStatus(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  if (sessions.size === 0) {
    await interaction.reply({
      content: "ℹ️ No active voice sessions. Use `/voice join` to start one.",
      ephemeral: true,
    });
    return;
  }

  const activeSessions = Array.from(sessions.entries()).map(([guildId, session]) => {
    const guildName = getGuildName(guildId);
    return `**${guildName}** (Guild ID: \`${guildId}\`, Channel ID: \`${session.opts.channelId}\`)`;
  });

  const sessionList = activeSessions.join("\n");
  const count = sessions.size;

  await interaction.reply({
    content: `🔊 **Active Voice Sessions** (${count})\n\n${sessionList}\n\nMultiple servers can have voice sessions simultaneously.`,
    ephemeral: true,
  });
}
