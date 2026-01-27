SELECT 
  sa.id as application_id,
  sa.status,
  s.id as sherpa_id,
  s.is_active,
  p.username
FROM sherpa_applications sa
LEFT JOIN sherpas s ON s.profile_id = sa.profile_id
LEFT JOIN profiles p ON p.id = sa.profile_id
WHERE sa.id = '095a79d9-ab82-4058-8129-813e4248c968';