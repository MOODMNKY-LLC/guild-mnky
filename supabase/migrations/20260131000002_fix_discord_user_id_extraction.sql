-- Fix Discord User ID Extraction in Profile Creation Trigger
-- Discord OAuth stores provider ID in auth.identities, not raw_user_meta_data
-- This migration updates the trigger to properly extract Discord user ID

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_community_id uuid;
  discord_user_id text;
BEGIN
  -- Get the Jupiter's Girth community ID (default fallback)
  SELECT id INTO default_community_id
  FROM public.communities
  WHERE anchor_discord_guild_id = '573823015511392268'
  LIMIT 1;

  -- Extract Discord user ID from auth.identities table
  -- Discord OAuth stores provider_id in identities table
  SELECT provider_id INTO discord_user_id
  FROM auth.identities
  WHERE user_id = new.id
    AND provider = 'discord'
  LIMIT 1;

  -- Fallback: Try to extract from raw_user_meta_data if identities query fails
  -- Some Supabase versions may include it in metadata
  IF discord_user_id IS NULL THEN
    discord_user_id := new.raw_user_meta_data->>'provider_id';
    
    -- Also try 'sub' field (some OAuth providers use this)
    IF discord_user_id IS NULL THEN
      discord_user_id := new.raw_user_meta_data->>'sub';
    END IF;
    
    -- Try 'id' field
    IF discord_user_id IS NULL THEN
      discord_user_id := new.raw_user_meta_data->>'id';
    END IF;
  END IF;

  -- Create profile with community assignment
  INSERT INTO public.profiles (
    id, 
    full_name, 
    username, 
    avatar_url,
    community_id,
    discord_user_id,
    display_name,
    role
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    default_community_id,
    discord_user_id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'discord_username'
    ),
    -- Assign admin to first user, otherwise member
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 
      THEN 'admin'::public.user_role 
      ELSE 'member'::public.user_role 
    END
  );
  
  RETURN new;
END;
$$;

-- Update existing profiles that don't have discord_user_id set
-- Extract from auth.identities for Discord OAuth users
UPDATE public.profiles p
SET discord_user_id = (
  SELECT i.provider_id
  FROM auth.identities i
  WHERE i.user_id = p.id
    AND i.provider = 'discord'
  LIMIT 1
)
WHERE p.discord_user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM auth.identities i
    WHERE i.user_id = p.id
      AND i.provider = 'discord'
  );

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates a profile when a new user signs up. Extracts Discord user ID from auth.identities table for Discord OAuth users.';
