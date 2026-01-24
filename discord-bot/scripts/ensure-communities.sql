-- Ensure Communities Exist for Discord Bot
-- Run this script to ensure both communities are in the database

-- Ensure Jupiter's Girth community exists
INSERT INTO public.communities (name, anchor_discord_guild_id, connected_discord_guild_ids)
VALUES (
  'Jupiter''s Girth',
  '573823015511392268',
  ARRAY['1291190711919837234']::text[] -- Connected to Sherpa Hub
)
ON CONFLICT (anchor_discord_guild_id) DO UPDATE
SET 
  name = EXCLUDED.name,
  connected_discord_guild_ids = EXCLUDED.connected_discord_guild_ids;

-- Ensure Sherpa Hub community exists
INSERT INTO public.communities (name, anchor_discord_guild_id, connected_discord_guild_ids)
VALUES (
  'Sherpa Hub',
  '1291190711919837234',
  ARRAY['573823015511392268']::text[] -- Connected to Jupiter's Girth
)
ON CONFLICT (anchor_discord_guild_id) DO UPDATE
SET 
  name = EXCLUDED.name,
  connected_discord_guild_ids = EXCLUDED.connected_discord_guild_ids;

-- Verify communities exist
SELECT name, anchor_discord_guild_id, connected_discord_guild_ids 
FROM public.communities 
WHERE anchor_discord_guild_id IN ('573823015511392268', '1291190711919837234');
