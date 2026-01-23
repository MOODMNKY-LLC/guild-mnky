-- Fix Communities RLS Policy for Assignment
-- The existing policy only allows reading communities that are already assigned to the user's profile,
-- which creates a chicken-and-egg problem when trying to assign a community to a user.
-- This migration adds a policy that allows authenticated users to read communities by anchor_discord_guild_id
-- so they can be assigned during profile setup.

-- Drop the restrictive policy
drop policy if exists "communities_read_own" on public.communities;

-- Create a more permissive policy: authenticated users can read all communities
-- This is safe because communities are not sensitive data (just names and Discord guild IDs)
-- Users can only interact with content from their assigned community due to other RLS policies
create policy "communities_read_authenticated"
on public.communities for select
to authenticated
using (true);

-- Keep the old policy name for backward compatibility if needed, but make it more permissive
-- Actually, we'll just use the new one above
