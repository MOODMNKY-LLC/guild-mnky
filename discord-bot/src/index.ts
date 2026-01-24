/**
 * Discord Bot Entry Point
 * Main file that initializes the bot and sets up event handlers
 */

import { Client, GatewayIntentBits, Collection, ActivityType } from 'discord.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { handleGuildMemberAdd } from './events/guildMemberAdd.js'
import { handleInteractionCreate } from './events/interactionCreate.js'
import { botLogger, logger } from './utils/logger.js'

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file in bot directory
// Must load BEFORE creating logger to ensure NODE_ENV is set
const envPath = join(__dirname, '..', '.env')
const envResult = dotenv.config({ path: envPath })

if (envResult.error) {
  console.error(`❌ Failed to load .env file from ${envPath}:`, envResult.error)
  console.error('Falling back to process environment variables')
} else {
  console.log(`✅ Environment variables loaded from ${envPath}`)
}

// Validate required environment variables
const requiredEnvVars = [
  'DISCORD_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

// Validate optional voice-related environment variables (warn if missing)
const voiceEnvVars = ['OPENAI_API_KEY', 'OPENAI_REALTIME_MODEL']
for (const envVar of voiceEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} not set. Voice functionality will not work.`)
  }
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`)
    process.exit(1)
  }
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for SERVER MEMBERS INTENT
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Optional: Only if reading message content
    GatewayIntentBits.GuildVoiceStates, // Required for voice functionality
  ],
})

// Set up command collection (for future use)
// Note: This is a placeholder for future command caching
// @ts-ignore - Discord.js doesn't have this in types but it's safe to add
client.commands = new Collection()

// Bot ready event (using clientReady for v15 compatibility)
client.once('ready', () => {
  botLogger.info(
    {
      botTag: client.user?.tag,
      botId: client.user?.id,
      guildCount: client.guilds.cache.size,
    },
    'Bot logged in successfully'
  )

  // Set bot activity
  client.user?.setActivity('Use /sherpa to get started', {
    type: ActivityType.Playing,
  })

  // Log connected guilds
  client.guilds.cache.forEach((guild) => {
    botLogger.info(
      {
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
      },
      'Connected to guild'
    )
  })
})

// Guild member add event
client.on('guildMemberAdd', handleGuildMemberAdd)

// Interaction create event (slash commands, buttons, modals)
client.on('interactionCreate', handleInteractionCreate)

// Error handling
client.on('error', (error) => {
  console.error('[Client] Error:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('[Process] Unhandled promise rejection:', error)
})

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  botLogger.fatal({ error }, 'Failed to login to Discord')
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  botLogger.info('Received SIGINT, shutting down gracefully')
  client.destroy()
  process.exit(0)
})

process.on('SIGTERM', () => {
  botLogger.info('Received SIGTERM, shutting down gracefully')
  client.destroy()
  process.exit(0)
})
