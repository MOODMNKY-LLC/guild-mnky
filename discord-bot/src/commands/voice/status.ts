/**
 * Voice Status Command
 * Shows which servers currently have active voice sessions
 */

import { ChatInputCommandInteraction } from "discord.js";
import { getActiveSession } from "./join.js";

export async function handleVoiceStatus(
  interaction: ChatInputCommandInteraction,
  communityId: string
) {
  const activeSession = getActiveSession();

  if (!activeSession) {
    await interaction.reply({
      content: "ℹ️ No active voice session. Use `/voice join` to start one.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `🔊 **Active Voice Session**\n\nServer: **${activeSession.guildName}**\nGuild ID: \`${activeSession.guildId}\`\nChannel ID: \`${activeSession.session.opts.channelId}\`\n\nℹ️ Only one server can have an active voice session at a time.`,
    ephemeral: true,
  });
}
