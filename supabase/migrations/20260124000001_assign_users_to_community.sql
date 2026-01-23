-- Assign Users to Community Migration
-- This migration updates the profile creation trigger to auto-assign users to Jupiter's Girth
-- and assigns existing users to the community

-- Update handle_new_user() trigger to auto-assign community
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  default_community_id uuid;
begin
  -- Get the Jupiter's Girth community ID
  select id into default_community_id
  from public.communities
  where anchor_discord_guild_id = '573823015511392268'
  limit 1;

  -- Create profile with community assignment
  insert into public.profiles (
    id, 
    full_name, 
    username, 
    avatar_url,
    community_id,
    discord_user_id,
    display_name
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    default_community_id,
    new.raw_user_meta_data->>'discord_user_id',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'discord_username'
    )
  );
  return new;
end;
$$;

-- Assign existing users without a community to Jupiter's Girth
do $$
declare
  jupiter_girth_id uuid;
begin
  -- Get Jupiter's Girth community ID
  select id into jupiter_girth_id
  from public.communities
  where anchor_discord_guild_id = '573823015511392268'
  limit 1;

  -- Only proceed if community exists
  if jupiter_girth_id is not null then
    -- Update profiles without a community
    update public.profiles
    set community_id = jupiter_girth_id
    where community_id is null;
  end if;
end $$;
