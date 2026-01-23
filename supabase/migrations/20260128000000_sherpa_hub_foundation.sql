-- Sherpa Hub Foundation Migration (Phase 1)
-- This migration adds Sherpa Hub community and enables multi-community support

-- 1. Create Sherpa Hub community record
INSERT INTO public.communities (name, anchor_discord_guild_id, connected_discord_guild_ids)
VALUES (
  'Sherpa Hub',
  '1291190711919837234',
  ARRAY['573823015511392268']::text[] -- Connected to Jupiter's Girth for cross-community visibility
)
ON CONFLICT (anchor_discord_guild_id) DO NOTHING;

-- 2. Add discord_guild_id to profiles table to store user's primary Discord guild
-- This allows us to determine which community a user belongs to
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_guild_id text;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_discord_guild_id 
ON public.profiles(discord_guild_id)
WHERE discord_guild_id IS NOT NULL;

-- 3. Helper function to get community by Discord guild ID
CREATE OR REPLACE FUNCTION public.get_community_by_guild_id(guild_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  community_uuid uuid;
BEGIN
  SELECT id INTO community_uuid
  FROM public.communities
  WHERE anchor_discord_guild_id = guild_id
  LIMIT 1;
  
  RETURN community_uuid;
END;
$$;

-- 4. Helper function to get user's community with fallback logic
-- Priority: 1) User's discord_guild_id -> community lookup
--           2) User's existing community_id (if set)
--           3) Default anchor guild from env (handled in application code)
CREATE OR REPLACE FUNCTION public.get_user_community(user_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  user_guild_id text;
  user_community_id uuid;
  matched_community_id uuid;
BEGIN
  -- Get user's profile with discord_guild_id and existing community_id
  SELECT discord_guild_id, community_id 
  INTO user_guild_id, user_community_id
  FROM public.profiles
  WHERE id = user_profile_id;
  
  -- If user has discord_guild_id, try to match to community
  IF user_guild_id IS NOT NULL THEN
    SELECT id INTO matched_community_id
    FROM public.communities
    WHERE anchor_discord_guild_id = user_guild_id
    LIMIT 1;
    
    -- If found, return matched community
    IF matched_community_id IS NOT NULL THEN
      RETURN matched_community_id;
    END IF;
  END IF;
  
  -- Fall back to existing community_id if set
  IF user_community_id IS NOT NULL THEN
    RETURN user_community_id;
  END IF;
  
  -- Return null if no match found (application will use DEFAULT_ANCHOR_GUILD_ID)
  RETURN NULL;
END;
$$;

-- 5. Update verifyDiscordMembership to set discord_guild_id when user joins
-- This will be called by the Discord bot when a user joins a guild
-- Note: This function already exists in lib/discord.ts, but we're adding the discord_guild_id update here
-- The application code will need to be updated to set this field

-- 6. Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_community_by_guild_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_community(uuid) TO authenticated;

-- 7. Add comment for documentation
COMMENT ON COLUMN public.profiles.discord_guild_id IS 'Primary Discord guild ID for this user. Used to determine community assignment. Set by Discord bot when user joins a guild.';
COMMENT ON FUNCTION public.get_community_by_guild_id(text) IS 'Helper function to get community UUID by Discord guild ID. Returns NULL if guild is not an anchor community.';
COMMENT ON FUNCTION public.get_user_community(uuid) IS 'Get user''s community with fallback logic: 1) discord_guild_id -> community lookup, 2) existing community_id, 3) NULL (app uses DEFAULT_ANCHOR_GUILD_ID)';
