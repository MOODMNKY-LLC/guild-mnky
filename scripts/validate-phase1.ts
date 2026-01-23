/**
 * Phase 1 Validation Script
 * 
 * Validates that Phase 1 implementation is working correctly:
 * 1. Sherpa Hub community exists
 * 2. Helper functions work
 * 3. Database schema is correct
 */

import { createClient } from '../lib/server'
import { getCommunityByGuildId, getUserCommunity } from '../lib/community-helpers'

async function validatePhase1() {
  console.log('🔍 Validating Phase 1: Sherpa Hub Foundation\n')

  const supabase = await createClient()

  // 1. Check if Sherpa Hub community exists
  console.log('1. Checking Sherpa Hub community...')
  const { data: sherpaHub, error: sherpaError } = await supabase
    .from('communities')
    .select('id, name, anchor_discord_guild_id, connected_discord_guild_ids')
    .eq('anchor_discord_guild_id', '1291190711919837234')
    .single()

  if (sherpaError || !sherpaHub) {
    console.error('❌ Sherpa Hub community not found:', sherpaError?.message)
    return false
  }
  console.log('✅ Sherpa Hub community exists:', {
    id: sherpaHub.id,
    name: sherpaHub.name,
    anchor_guild: sherpaHub.anchor_discord_guild_id,
    connected_guilds: sherpaHub.connected_discord_guild_ids
  })

  // 2. Check if Jupiter's Girth community exists (backward compatibility)
  console.log('\n2. Checking Jupiter\'s Girth community...')
  const { data: jupiterGirth, error: jupiterError } = await supabase
    .from('communities')
    .select('id, name, anchor_discord_guild_id')
    .eq('anchor_discord_guild_id', '573823015511392268')
    .single()

  if (jupiterError || !jupiterGirth) {
    console.error('❌ Jupiter\'s Girth community not found:', jupiterError?.message)
    return false
  }
  console.log('✅ Jupiter\'s Girth community exists:', {
    id: jupiterGirth.id,
    name: jupiterGirth.name
  })

  // 3. Check if discord_guild_id column exists in profiles
  console.log('\n3. Checking profiles table schema...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, discord_guild_id, community_id')
    .limit(1)

  if (profilesError) {
    console.error('❌ Error querying profiles:', profilesError.message)
    return false
  }
  console.log('✅ Profiles table accessible, discord_guild_id column exists')

  // 4. Test helper function: getCommunityByGuildId
  console.log('\n4. Testing getCommunityByGuildId helper...')
  const sherpaCommunityId = await getCommunityByGuildId('1291190711919837234')
  if (!sherpaCommunityId) {
    console.error('❌ getCommunityByGuildId failed for Sherpa Hub')
    return false
  }
  console.log('✅ getCommunityByGuildId works for Sherpa Hub:', sherpaCommunityId)

  const jupiterCommunityId = await getCommunityByGuildId('573823015511392268')
  if (!jupiterCommunityId) {
    console.error('❌ getCommunityByGuildId failed for Jupiter\'s Girth')
    return false
  }
  console.log('✅ getCommunityByGuildId works for Jupiter\'s Girth:', jupiterCommunityId)

  // 5. Test helper function: getUserCommunity (requires authenticated user)
  console.log('\n5. Testing getUserCommunity helper...')
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const userCommunityId = await getUserCommunity(user.id)
    if (userCommunityId) {
      console.log('✅ getUserCommunity works for current user:', userCommunityId)
    } else {
      console.log('⚠️  getUserCommunity returned null (user may not have community assigned)')
    }
  } else {
    console.log('⚠️  No authenticated user, skipping getUserCommunity test')
  }

  // 6. Check database functions exist
  console.log('\n6. Checking database functions...')
  const { data: functions, error: functionsError } = await supabase
    .rpc('get_community_by_guild_id', { guild_id: '1291190711919837234' })

  if (functionsError) {
    console.error('❌ Database function get_community_by_guild_id not working:', functionsError.message)
    return false
  }
  console.log('✅ Database function get_community_by_guild_id works')

  console.log('\n✅ Phase 1 validation complete! All checks passed.')
  return true
}

// Run validation
validatePhase1()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Validation error:', error)
    process.exit(1)
  })
