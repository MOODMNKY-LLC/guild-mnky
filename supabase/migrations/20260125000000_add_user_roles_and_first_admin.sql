-- Add user roles and assign admin to first user
-- This migration adds a role system and automatically assigns admin to the first authenticated user

-- Create user_role enum if it doesn't exist
do $$ begin
  create type public.user_role as enum ('member','officer','admin');
exception when duplicate_object then null;
end $$;

-- Add role column to profiles table
alter table public.profiles
  add column if not exists role public.user_role not null default 'member';

-- Create index on role for faster queries
create index if not exists profiles_role_idx on public.profiles(role);

-- Update handle_new_user function to assign admin to first user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  user_count integer;
begin
  -- Count existing users
  select count(*) into user_count
  from public.profiles;
  
  -- Insert new profile
  insert into public.profiles (id, full_name, username, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url',
    -- If this is the first user (count = 0), assign admin role, otherwise member
    case when user_count = 0 then 'admin'::public.user_role else 'member'::public.user_role end
  );
  
  return new;
end;
$$;

-- Update existing users: assign admin to the first user if no admin exists
do $$
declare
  first_user_id uuid;
  admin_count integer;
begin
  -- Check if any admin exists
  select count(*) into admin_count
  from public.profiles
  where role = 'admin';
  
  -- If no admin exists, assign admin to the first user (oldest created_at)
  if admin_count = 0 then
    select id into first_user_id
    from public.profiles
    order by created_at asc
    limit 1;
    
    if first_user_id is not null then
      update public.profiles
      set role = 'admin'
      where id = first_user_id;
      
      raise notice 'Assigned admin role to first user: %', first_user_id;
    end if;
  end if;
end $$;

-- Create a security definer function to check if current user is admin
-- This bypasses RLS to avoid infinite recursion when checking admin status
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

-- Drop the new admin policy if it exists (in case migration is re-run)
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Add RLS policy for admins to view all profiles (for admin panel)
-- This policy works alongside the existing "Users can view own profile" policy
-- Supabase ORs policies together, so users can see their own profile OR admins can see all
-- Using the security definer function avoids infinite recursion
-- Specifying 'to authenticated' prevents this policy from running for anonymous users
create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (public.is_current_user_admin());

-- Add comment explaining the role system
comment on column public.profiles.role is 'User role: member (default), officer, or admin. First user is automatically assigned admin role.';
