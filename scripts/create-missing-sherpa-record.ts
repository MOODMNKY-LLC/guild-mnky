/**
 * Script to create missing Sherpa records for approved applications
 * 
 * Usage: npx tsx scripts/create-missing-sherpa-record.ts [application_id]
 * 
 * If application_id is provided, creates record for that application only
 * Otherwise, creates records for all approved applications missing sherpa records
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

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

async function createMissingSherpaRecords(applicationId?: string) {
  try {
    console.log('\n🔍 Finding approved applications missing Sherpa records...\n')

    // Build query
    let query = supabase
      .from('sherpa_applications')
      .select(`
        id,
        profile_id,
        community_id,
        specialties,
        availability,
        status
      `)
      .eq('status', 'approved')

    if (applicationId) {
      query = query.eq('id', applicationId)
    }

    const { data: applications, error: appsError } = await query

    if (appsError) {
      throw new Error(`Failed to fetch applications: ${appsError.message}`)
    }

    if (!applications || applications.length === 0) {
      console.log('✅ No approved applications found')
      return
    }

    console.log(`Found ${applications.length} approved application(s)\n`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const app of applications) {
      // Check if Sherpa record already exists
      const { data: existing } = await supabase
        .from('sherpas')
        .select('id')
        .eq('profile_id', app.profile_id)
        .eq('community_id', app.community_id)
        .single()

      if (existing) {
        console.log(`⏭️  Skipping application ${app.id} - Sherpa record already exists (${existing.id})`)
        skipped++
        continue
      }

      // Get profile info for logging
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', app.profile_id)
        .single()

      // Create Sherpa record
      const { data: newSherpa, error: createError } = await supabase
        .from('sherpas')
        .insert({
          profile_id: app.profile_id,
          community_id: app.community_id,
          application_id: app.id,
          specialties: app.specialties,
          availability: app.availability,
          is_active: true,
        })
        .select('id')
        .single()

      if (createError) {
        console.error(`❌ Failed to create Sherpa record for application ${app.id}:`, createError.message)
        errors++
        continue
      }

      const displayName = profile?.username || profile?.full_name || app.profile_id
      console.log(`✅ Created Sherpa record ${newSherpa.id} for ${displayName} (application: ${app.id})`)
      created++
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${applications.length}`)

  } catch (error: any) {
    console.error('\n❌ Error during backfill:', error.message)
    process.exit(1)
  }
}

// Get application ID from command line args
const applicationId = process.argv[2]

if (applicationId) {
  console.log(`Creating Sherpa record for application: ${applicationId}`)
} else {
  console.log('Creating Sherpa records for all approved applications missing records')
}

createMissingSherpaRecords(applicationId)
