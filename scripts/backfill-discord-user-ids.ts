/**
 * Script to backfill discord_user_id for existing users
 * 
 * Extracts Discord user ID from auth.identities for users who authenticated via Discord
 * but don't have discord_user_id set in their profile
 * 
 * Usage: npx tsx scripts/backfill-discord-user-ids.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function backfillDiscordUserIds() {
  try {
    console.log('\n🔍 Finding users without discord_user_id...\n')

    // Get all profiles without discord_user_id
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .is('discord_user_id', null)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.log('✅ All profiles already have discord_user_id set!')
      return
    }

    console.log(`Found ${profiles.length} profiles without discord_user_id\n`)

    let updated = 0
    let skipped = 0

    for (const profile of profiles) {
      // Query auth.identities via RPC or direct query
      // Note: We need to use service role to access auth schema
      const { data: identities, error: identitiesError } = await supabase
        .rpc('exec_sql', {
          query: `
            SELECT provider_id 
            FROM auth.identities 
            WHERE user_id = '${profile.id}' 
              AND provider = 'discord'
            LIMIT 1
          `
        })
        .catch(() => {
          // Fallback: Use direct SQL query via service role
          return supabase
            .from('profiles')
            .select('*')
            .eq('id', profile.id)
            .single()
        })

      // Alternative: Use Supabase Management API or direct PostgreSQL connection
      // For now, we'll use a workaround - query user metadata
      const { data: user, error: userError } = await supabase.auth.admin.getUserById(profile.id)

      if (userError || !user) {
        console.log(`⚠️  Could not fetch user ${profile.id}: ${userError?.message || 'User not found'}`)
        skipped++
        continue
      }

      // Check identities
      const discordIdentity = user.identities?.find((id: any) => id.provider === 'discord')
      
      if (!discordIdentity) {
        console.log(`⚠️  User ${profile.id} does not have Discord identity`)
        skipped++
        continue
      }

      const discordUserId = discordIdentity.provider_id || discordIdentity.id

      if (!discordUserId) {
        console.log(`⚠️  User ${profile.id} has Discord identity but no provider_id`)
        skipped++
        continue
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ discord_user_id: discordUserId })
        .eq('id', profile.id)

      if (updateError) {
        console.error(`❌ Failed to update profile ${profile.id}: ${updateError.message}`)
        skipped++
        continue
      }

      console.log(`✅ Updated profile ${profile.id} with Discord user ID: ${discordUserId}`)
      updated++
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${profiles.length}`)

  } catch (error: any) {
    console.error('\n❌ Error during backfill:', error.message)
    process.exit(1)
  }
}

backfillDiscordUserIds()
