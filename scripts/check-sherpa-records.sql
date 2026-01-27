-- Check if Sherpa records exist for approved applications
-- Run this in Supabase SQL Editor to verify if records were created despite the error

-- Check all approved applications
SELECT 
  sa.id as application_id,
  sa.profile_id,
  sa.status,
  sa.reviewed_at,
  s.id as sherpa_id,
  s.is_active,
  s.created_at as sherpa_created_at,
  p.username,
  p.full_name
FROM sherpa_applications sa
LEFT JOIN sherpas s ON s.profile_id = sa.profile_id AND s.community_id = sa.community_id
LEFT JOIN profiles p ON p.id = sa.profile_id
WHERE sa.status = 'approved'
ORDER BY sa.reviewed_at DESC;

-- Check if any approved applications are missing sherpa records
SELECT 
  sa.id as application_id,
  sa.profile_id,
  sa.status,
  sa.reviewed_at,
  p.username,
  p.full_name,
  'MISSING SHERPA RECORD' as issue
FROM sherpa_applications sa
LEFT JOIN profiles p ON p.id = sa.profile_id
WHERE sa.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 
    FROM sherpas s 
    WHERE s.profile_id = sa.profile_id 
      AND s.community_id = sa.community_id
  )
ORDER BY sa.reviewed_at DESC;
