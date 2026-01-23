/**
 * Deploy Commands Script
 * Registers slash commands with Discord
 */

import { REST, Routes, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const commands = [
  // /sherpa command group
  new SlashCommandBuilder()
    .setName('sherpa')
    .setDescription('Sherpa program commands')
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('apply')
        .setDescription('Start Sherpa application process')
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('request')
        .setDescription('Create a Sherpa request')
        .addStringOption(option =>
          option
            .setName('activity')
            .setDescription('Activity type (e.g., "Last Wish Raid")')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('difficulty')
            .setDescription('Difficulty level')
            .addChoices(
              { name: 'Normal', value: 'Normal' },
              { name: 'Master', value: 'Master' },
              { name: 'Grandmaster', value: 'Grandmaster' }
            )
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('scheduled_time')
            .setDescription('ISO 8601 timestamp for scheduled sessions')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('notes')
            .setDescription('Additional details (max 500 chars)')
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('sessions')
        .setDescription('List upcoming or past Sherpa sessions')
        .addStringOption(option =>
          option
            .setName('filter')
            .setDescription('Filter type')
            .addChoices(
              { name: 'Upcoming', value: 'upcoming' },
              { name: 'Past', value: 'past' },
              { name: 'My Sessions', value: 'my-sessions' },
              { name: 'All', value: 'all' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('profile')
        .setDescription('Display Sherpa profile and statistics')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Target user (defaults to you)')
            .setRequired(false)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('oath')
        .setDescription('Display Guardian Oath principles')
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('rating')
        .setDescription('Rate a completed Sherpa session')
        .addStringOption(option =>
          option
            .setName('session_id')
            .setDescription('Session ID from completed session')
            .setRequired(true)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('vote-resign')
        .setDescription('Vote to end a session without penalty')
        .addStringOption(option =>
          option
            .setName('session_id')
            .setDescription('Active session ID')
            .setRequired(true)
        )
    ),

  // /sherpa-admin command group
  new SlashCommandBuilder()
    .setName('sherpa-admin')
    .setDescription('Sherpa admin commands (Administrator only)')
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('review')
        .setDescription('Review and approve/deny Sherpa applications')
        .addStringOption(option =>
          option
            .setName('application_id')
            .setDescription('Application ID from /sherpa apply')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Approve or deny')
            .addChoices(
              { name: 'Approve', value: 'approve' },
              { name: 'Deny', value: 'deny' }
            )
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for approval/denial')
            .setRequired(false)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('list')
        .setDescription('List applications, requests, or sessions by status')
        .addStringOption(option =>
          option
            .setName('status')
            .setDescription('Filter by status')
            .addChoices(
              { name: 'Pending', value: 'pending' },
              { name: 'Approved', value: 'approved' },
              { name: 'Denied', value: 'denied' },
              { name: 'All', value: 'all' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('stats')
        .setDescription('Display Sherpa program statistics')
    ),
].map(command => command.toJSON())

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!)

async function deployCommands() {
  try {
    console.log('🔄 Started refreshing application (/) commands.')

    const clientId = process.env.DISCORD_CLIENT_ID!
    const guildId = process.env.SHERPA_HUB_GUILD_ID! // Deploy to Sherpa Hub first

    // Deploy guild-specific commands (instant updates)
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    ) as any[]

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`)
    console.log(`📋 Commands deployed to guild: ${guildId}`)
  } catch (error) {
    console.error('❌ Error deploying commands:', error)
    process.exit(1)
  }
}

deployCommands()
