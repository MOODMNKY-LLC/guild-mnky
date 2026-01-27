/**
 * Script to get Discord Role ID for Verified Guardian role
 * 
 * Usage: npx tsx scripts/get-discord-role-id.ts
 * 
 * This script connects to Discord API and lists all roles in the guild,
 * helping you find the Verified Guardian role ID.
 * 
 * Note: Make sure .env.local is loaded (Next.js does this automatically)
 * Or set environment variables manually:
 *   DISCORD_BOT_TOKEN=your_token
 *   SHERPA_HUB_GUILD_ID=1291190711919837234
 */

// Read from environment (assumes .env.local is loaded or env vars are set)
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = process.env.SHERPA_HUB_GUILD_ID || '1291190711919837234'

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
    const sortedRoles = roles.sort((a: any, b: any) => b.position - a.position)

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
    const verifiedGuardian = roles.find((r: any) => 
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

  } catch (error: any) {
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
