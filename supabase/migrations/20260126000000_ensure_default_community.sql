-- Ensure Jupiter's Girth Community Exists
-- This migration ensures the default community exists for the application to function
-- It's safe to run multiple times due to ON CONFLICT clause
-- This runs after all schema migrations to ensure the community is present

-- Seed Jupiter's Girth community (if it doesn't exist)
insert into public.communities (name, anchor_discord_guild_id, connected_discord_guild_ids)
values ('Jupiter''s Girth', '573823015511392268', ARRAY[]::text[])
on conflict (anchor_discord_guild_id) do nothing;
