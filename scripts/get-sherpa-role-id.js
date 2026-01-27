/**
 * Script to get Sherpa role ID from Discord
 * 
 * Usage: node scripts/get-sherpa-role-id.js
 * 
 * Requires DISCORD_BOT_TOKEN and SHERPA_HUB_GUILD_ID in environment or .env.local
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

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ Missing DISCORD_BOT_TOKEN environment variable')
  process.exit(1)
}

async function getSherpaRoleId() {
  try {
    console.log(`\n🔍 Fetching roles for guild: ${GUILD_ID}\n`)

    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Discord API error: ${response.status} ${errorText}`)
    }

    const roles = await response.json()

    // Find Sherpa role (case-insensitive)
    const sherpaRole = roles.find(role => 
      role.name.toLowerCase() === 'sherpa' || 
      role.name.toLowerCase().includes('sherpa')
    )

    if (!sherpaRole) {
      console.log('❌ Sherpa role not found. Available roles:')
      roles.forEach(role => {
        console.log(`   - ${role.name} (ID: ${role.id})`)
      })
      return
    }

    console.log('✅ Found Sherpa role:')
    console.log(`   Name: ${sherpaRole.name}`)
    console.log(`   ID: ${sherpaRole.id}`)
    console.log(`   Color: #${sherpaRole.color.toString(16).padStart(6, '0')}`)
    console.log(`   Position: ${sherpaRole.position}`)
    console.log(`   Mentionable: ${sherpaRole.mentionable}`)
    console.log(`   Hoisted: ${sherpaRole.hoist}`)
    console.log('\n📝 Add this to your .env.local:')
    console.log(`SHERPA_ROLE_ID=${sherpaRole.id}`)
    console.log(`NEXT_PUBLIC_SHERPA_ROLE_ID=${sherpaRole.id}`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

getSherpaRoleId()
