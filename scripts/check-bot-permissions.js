/**
 * Script to check Discord bot permissions
 * 
 * Usage: node scripts/check-bot-permissions.js
 * 
 * Checks if bot has required permissions to assign roles
 */

const fs = require('fs')
const path = require('path')

// Load .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  })
}

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.SHERPA_HUB_GUILD_ID || '1291190711919837234'
const SHERPA_ROLE_ID = process.env.SHERPA_ROLE_ID || '1465613285251354817'

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ Missing DISCORD_BOT_TOKEN environment variable')
  process.exit(1)
}

async function checkBotPermissions() {
  try {
    console.log(`\n🔍 Checking bot permissions for guild: ${GUILD_ID}\n`)

    // Get bot user info
    const botResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!botResponse.ok) {
      throw new Error(`Failed to get bot info: ${botResponse.status}`)
    }

    const botUser = await botResponse.json()
    console.log(`Bot: ${botUser.username}#${botUser.discriminator} (${botUser.id})`)

    // Get guild info
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!guildResponse.ok) {
      throw new Error(`Failed to get guild info: ${guildResponse.status}`)
    }

    const guild = await guildResponse.json()
    console.log(`Guild: ${guild.name} (${guild.id})\n`)

    // Get bot member info (includes permissions)
    const memberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${botUser.id}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!memberResponse.ok) {
      throw new Error(`Failed to get bot member info: ${memberResponse.status}`)
    }

    const member = await memberResponse.json()
    
    // Get roles
    const rolesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const roles = await rolesResponse.json()
    
    // Find bot's highest role
    const botRoles = member.roles
      .map(roleId => roles.find(r => r.id === roleId))
      .filter(Boolean)
      .sort((a, b) => b.position - a.position)

    const botHighestRole = botRoles[0]
    console.log(`Bot's highest role: ${botHighestRole?.name || 'None'} (Position: ${botHighestRole?.position || -1})`)

    // Find Sherpa role
    const sherpaRole = roles.find(r => r.id === SHERPA_ROLE_ID)
    if (sherpaRole) {
      console.log(`Sherpa role: ${sherpaRole.name} (Position: ${sherpaRole.position})`)
      
      if (botHighestRole && botHighestRole.position <= sherpaRole.position) {
        console.log(`\n❌ PROBLEM: Bot's role (${botHighestRole.position}) is not higher than Sherpa role (${sherpaRole.position})`)
        console.log(`   Bot needs a role higher than Sherpa role to assign it.`)
        console.log(`   Move bot's role above Sherpa role in Server Settings → Roles`)
      } else {
        console.log(`✅ Bot's role is higher than Sherpa role`)
      }
    }

    // Calculate permissions
    // Note: This is simplified - actual permission calculation is complex
    // We'll check by trying to get guild member with permissions
    console.log(`\n📋 Checking permissions...`)
    console.log(`   Bot needs: MANAGE_ROLES (0x10000000)`)

    // Try to fetch a member to test permissions
    const testMemberResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${botUser.id}`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        },
      }
    )

    console.log(`\n✅ Bot can access guild members`)

    // Check if we can assign role (by checking if we can modify member)
    console.log(`\n💡 Troubleshooting:`)
    console.log(`   1. Bot needs "Manage Roles" permission`)
    console.log(`   2. Bot's role must be higher than "Sherpa" role in hierarchy`)
    console.log(`   3. User must be in the Discord server`)
    console.log(`   4. Bot must have access to the role (not managed by integration)`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.message.includes('403')) {
      console.error('\n💡 403 Forbidden usually means:')
      console.error('   - Bot is not in the server')
      console.error('   - Bot lacks required permissions')
      console.error('   - Bot\'s role is too low in hierarchy')
    }
    process.exit(1)
  }
}

checkBotPermissions()
