-- Phase 1 Validation SQL Script
-- Run this in Supabase Studio SQL Editor or via psql to validate Phase 1 implementation

-- 1. Check if Sherpa Hub community exists
SELECT 
  'Sherpa Hub Community Check' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as found_count
FROM public.communities
WHERE anchor_discord_guild_id = '1291190711919837234';

-- Show Sherpa Hub details
SELECT 
  'Sherpa Hub Details' as test_name,
  id,
  name,
  anchor_discord_guild_id,
  connected_discord_guild_ids,
  created_at
FROM public.communities
WHERE anchor_discord_guild_id = '1291190711919837234';

-- 2. Check if Jupiter's Girth community exists (backward compatibility)
SELECT 
  'Jupiter''s Girth Community Check' as test_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as found_count
FROM public.communities
WHERE anchor_discord_guild_id = '573823015511392268';

-- 3. Check if discord_guild_id column exists in profiles
SELECT 
  'Profiles discord_guild_id Column Check' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'discord_guild_id'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END as status;

-- 4. Test helper function: get_community_by_guild_id
SELECT 
  'get_community_by_guild_id Function Test (Sherpa Hub)' as test_name,
  CASE 
    WHEN public.get_community_by_guild_id('1291190711919837234') IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  public.get_community_by_guild_id('1291190711919837234') as community_id;

SELECT 
  'get_community_by_guild_id Function Test (Jupiter''s Girth)' as test_name,
  CASE 
    WHEN public.get_community_by_guild_id('573823015511392268') IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  public.get_community_by_guild_id('573823015511392268') as community_id;

-- 5. Test helper function: get_user_community (test with a sample user if exists)
SELECT 
  'get_user_community Function Test' as test_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM public.profiles 
      LIMIT 1
    ) THEN 'CAN TEST'
    ELSE 'NO USERS TO TEST'
  END as status;

-- If users exist, test the function
DO $$
DECLARE
  test_user_id uuid;
  test_result uuid;
BEGIN
  -- Get first user if exists
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    test_result := public.get_user_community(test_user_id);
    RAISE NOTICE 'get_user_community test for user %: %', test_user_id, 
      CASE WHEN test_result IS NOT NULL THEN 'PASS - returned ' || test_result::text ELSE 'FAIL - returned NULL' END;
  ELSE
    RAISE NOTICE 'get_user_community test: SKIP - no users in database';
  END IF;
END $$;

-- 6. Check function permissions
SELECT 
  'Function Permissions Check' as test_name,
  routine_name,
  routine_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN 'PASS'
    ELSE 'WARN'
  END as security_status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_community_by_guild_id', 'get_user_community');

-- Summary
SELECT 
  '=== PHASE 1 VALIDATION SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM public.communities WHERE anchor_discord_guild_id = '1291190711919837234') as sherpa_hub_exists,
  (SELECT COUNT(*) FROM public.communities WHERE anchor_discord_guild_id = '573823015511392268') as jupiter_girth_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'discord_guild_id') as discord_guild_id_column_exists,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_community_by_guild_id') as get_community_function_exists,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_user_community') as get_user_community_function_exists;
