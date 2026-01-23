-- Fix infinite recursion in profiles RLS policy
-- This script should be run directly in Supabase SQL Editor for production

-- Step 1: Ensure the security definer function exists and is correct
create or replace function public.is_current_user_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where id = auth.uid();

  return user_role = 'admin';
end;
$$;

-- Step 2: Drop the problematic admin policy if it exists
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Step 3: Recreate the admin policy using the security definer function
-- This avoids infinite recursion by bypassing RLS when checking admin status
create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_current_user_admin());

-- Verify the function exists and works
select 
  proname as function_name,
  prosecdef as is_security_definer,
  prosrc as function_body
from pg_proc
where proname = 'is_current_user_admin';
