/**
 * Script to get Discord Role ID for Verified Guardian role
 * 
 * Usage: node scripts/get-discord-role-id.js
 * 
 * Reads .env.local and fetches roles from Discord API
 */

const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(process.cwd(), '.env.local')
let envContent = ''
try {
  envContent = fs.readFileSync(envPath, 'utf8')
} catch (error) {
  console.error('❌ Could not read .env.local file')
  process.exit(1)
}

// Parse environment variables
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const DISCORD_BOT_TOKEN = envVars.DISCORD_BOT_TOKEN
const GUILD_ID = envVars.SHERPA_HUB_GUILD_ID || '1291190711919837234'

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN not found in .env.local')
  process.exit(1)
}

async function getGuildRoles() {
  try {
    console.log(`\n🔍 Fetching roles for guild: ${GUILD_ID}\n`)

    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Discord API error: ${response.status} ${response.statusText}\n${error}`)
    }

    const roles = await response.json()

    console.log(`✅ Found ${roles.length} roles:\n`)
    console.log('─'.repeat(80))

    // Sort roles by position (highest first)
    const sortedRoles = roles.sort((a, b) => b.position - a.position)

    for (const role of sortedRoles) {
      const isLinkedRole = role.tags?.premium_subscriber !== undefined || 
                          role.tags?.bot_id !== undefined ||
                          role.tags?.integration_id !== undefined ||
                          role.name.toLowerCase().includes('verified') ||
                          role.name.toLowerCase().includes('guardian')

      const marker = isLinkedRole ? '⭐' : '  '
      const linkedRoleNote = isLinkedRole ? ' (Possible Linked Role)' : ''

      console.log(`${marker} Role: ${role.name}`)
      console.log(`   ID: ${role.id}`)
      console.log(`   Position: ${role.position}`)
      console.log(`   Color: ${role.color ? `#${role.color.toString(16).padStart(6, '0')}` : 'Default'}`)
      console.log(`   Mentionable: ${role.mentionable ? 'Yes' : 'No'}`)
      console.log(`   Hoisted: ${role.hoist ? 'Yes' : 'No'}`)
      if (role.tags) {
        console.log(`   Tags: ${JSON.stringify(role.tags)}`)
      }
      console.log(`   ${linkedRoleNote}`)
      console.log('─'.repeat(80))
    }

    // Look specifically for Verified Guardian
    const verifiedGuardian = roles.find(r => 
      r.name.toLowerCase().includes('verified') && 
      r.name.toLowerCase().includes('guardian')
    )

    if (verifiedGuardian) {
      console.log(`\n🎯 Found "Verified Guardian" role!\n`)
      console.log(`   Role Name: ${verifiedGuardian.name}`)
      console.log(`   Role ID: ${verifiedGuardian.id}`)
      console.log(`\n✅ Add this to your .env.local:`)
      console.log(`   NEXT_PUBLIC_VERIFIED_GUARDIAN_ROLE_ID=${verifiedGuardian.id}`)
      console.log(`   NEXT_PUBLIC_DISCORD_GUILD_ID=${GUILD_ID}`)
    } else {
      console.log(`\n⚠️  Could not find a role matching "Verified Guardian"`)
      console.log(`   Look for a role with "verified" or "guardian" in the name above.`)
      console.log(`   Or check Discord Server Settings → Roles to find the Linked Role.`)
    }

    // Also check guild info
    console.log(`\n📋 Guild Information:\n`)
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (guildResponse.ok) {
      const guild = await guildResponse.json()
      console.log(`   Guild Name: ${guild.name}`)
      console.log(`   Guild ID: ${guild.id}`)
      console.log(`   Member Count: ${guild.approximate_member_count || 'N/A'}`)
    }

  } catch (error) {
    console.error('\n❌ Error fetching roles:', error.message)
    if (error.message.includes('401')) {
      console.error('   → Check that DISCORD_BOT_TOKEN is valid')
    } else if (error.message.includes('404')) {
      console.error('   → Check that SHERPA_HUB_GUILD_ID is correct')
      console.error('   → Ensure bot is in the guild')
    }
    process.exit(1)
  }
}

getGuildRoles()
