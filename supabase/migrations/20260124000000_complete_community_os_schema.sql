-- Complete Community OS Schema Migration
-- This migration adds missing tables and fields from the PRD to complete the MVP schema

-- Enable extensions
create extension if not exists pgcrypto;

-- Create enums (if they don't exist)
do $$ begin
  create type public.rsvp_status as enum ('going','maybe','declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lfg_status as enum ('open','full','closed','cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.doc_status as enum ('draft','review','published','archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.doc_type as enum ('guide','playbook','announcement','policy','changelog');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.doc_audience as enum ('member','officer','admin');
exception when duplicate_object then null;
end $$;

-- Create communities table
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  anchor_discord_guild_id text not null,
  connected_discord_guild_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists communities_anchor_guild_uidx
on public.communities(anchor_discord_guild_id);

-- Update profiles table to add Discord fields and community_id
alter table public.profiles
  add column if not exists community_id uuid references public.communities(id) on delete set null,
  add column if not exists discord_user_id text,
  add column if not exists discord_role_ids text[] not null default '{}',
  add column if not exists roles_synced_at timestamptz,
  add column if not exists display_name text;

-- Create unique index on discord_user_id
create unique index if not exists profiles_discord_user_uidx
on public.profiles(discord_user_id)
where discord_user_id is not null;

-- Update events table to match PRD schema
alter table public.events
  add column if not exists community_id uuid references public.communities(id) on delete cascade,
  add column if not exists description text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists capacity integer,
  add column if not exists created_by uuid references public.profiles(id) on delete restrict,
  add column if not exists updated_at timestamptz default now();

-- Migrate start_at to starts_at if it exists
do $$
begin
  if exists (select 1 from information_schema.columns 
             where table_schema = 'public' 
             and table_name = 'events' 
             and column_name = 'start_at') then
    update public.events set starts_at = start_at where starts_at is null;
    alter table public.events drop column if exists start_at;
  end if;
end $$;

-- Migrate roles array to description if needed (keep roles for now as it might be used)
-- Keep slots_total and slots_filled for backward compatibility

-- Create event_rsvps table
create table if not exists public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status public.rsvp_status not null default 'going',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Update lfg_posts table to match PRD schema
alter table public.lfg_posts
  add column if not exists community_id uuid references public.communities(id) on delete cascade,
  add column if not exists description text,
  add column if not exists starts_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete restrict,
  add column if not exists updated_at timestamptz default now();

-- Migrate window_text and intent to description if they exist
do $$
begin
  if exists (select 1 from information_schema.columns 
             where table_schema = 'public' 
             and table_name = 'lfg_posts' 
             and column_name = 'window_text') then
    update public.lfg_posts 
    set description = coalesce(description, '') || 
                      case when window_text is not null then 'Time: ' || window_text || E'\n' else '' end ||
                      case when intent is not null then 'Intent: ' || intent else '' end
    where description is null or description = '';
  end if;
end $$;

-- Update status column to use enum type
do $$
begin
  -- Convert text status to enum if needed
  if exists (select 1 from information_schema.columns 
             where table_schema = 'public' 
             and table_name = 'lfg_posts' 
             and column_name = 'status' 
             and data_type = 'text') then
    alter table public.lfg_posts 
    alter column status type text;
    
    -- We'll handle enum conversion in application code for now
    -- to avoid data loss
  end if;
end $$;

-- Create lfg_members table
create table if not exists public.lfg_members (
  lfg_post_id uuid not null references public.lfg_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (lfg_post_id, profile_id)
);

-- Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Update guides table to match docs_documents schema (keep guides for backward compat)
-- We'll create docs_documents separately and can migrate guides later
alter table public.guides
  add column if not exists community_id uuid references public.communities(id) on delete cascade,
  add column if not exists slug text,
  add column if not exists mdx_body text,
  add column if not exists summary text;

-- Create docs_documents table (full Notion MDX cache)
create table if not exists public.docs_documents (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade, -- null = global
  notion_page_id text not null,
  title text not null,
  slug text not null,
  status public.doc_status not null default 'draft',
  doc_type public.doc_type not null default 'guide',
  audience public.doc_audience not null default 'member',
  tags text[] not null default '{}',
  summary text,
  mdx_body text not null default '',
  mdx_frontmatter jsonb not null default '{}'::jsonb,
  notion_last_edited_at timestamptz,
  published_at timestamptz,
  last_synced_at timestamptz,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists docs_documents_notion_page_uidx
on public.docs_documents(notion_page_id);

create unique index if not exists docs_documents_slug_scope_uidx
on public.docs_documents(coalesce(community_id::text,'global'), slug);

-- Create integration_config table
create table if not exists public.integration_config (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade, -- null = global
  provider text not null, -- e.g. 'notion', 'bungie', 'discord'
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_config_provider_scope_uidx
on public.integration_config(coalesce(community_id::text,'global'), provider);

-- Create updated_at trigger function (if it doesn't exist)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Add updated_at triggers to all tables
do $$ begin
  create trigger communities_set_updated_at
  before update on public.communities
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger event_rsvps_set_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger lfg_posts_set_updated_at
  before update on public.lfg_posts
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger docs_documents_set_updated_at
  before update on public.docs_documents
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger integration_config_set_updated_at
  before update on public.integration_config
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

-- Enable RLS on new tables
alter table public.communities enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.lfg_members enable row level security;
alter table public.announcements enable row level security;
alter table public.docs_documents enable row level security;
alter table public.integration_config enable row level security;

-- Create helper view for current user profile
create or replace view public.my_profile as
select p.*
from public.profiles p
where p.id = auth.uid();

-- RLS Policies for new tables

-- Communities: authenticated users can read their own community
create policy "communities_read_own"
on public.communities for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.community_id = communities.id
  )
);

-- Event RSVPs: read community events, write own RSVPs
create policy "event_rsvps_read_community"
on public.event_rsvps for select
to authenticated
using (
  exists (
    select 1 from public.events e
    join public.profiles p on p.id = auth.uid()
    where e.id = event_rsvps.event_id and p.community_id = e.community_id
  )
);

create policy "event_rsvps_insert_own"
on public.event_rsvps for insert
to authenticated
with check (profile_id = auth.uid());

create policy "event_rsvps_update_own"
on public.event_rsvps for update
to authenticated
using (profile_id = auth.uid());

create policy "event_rsvps_delete_own"
on public.event_rsvps for delete
to authenticated
using (profile_id = auth.uid());

-- LFG Members: read community, write own
create policy "lfg_members_read_community"
on public.lfg_members for select
to authenticated
using (
  exists (
    select 1 from public.lfg_posts l
    join public.profiles p on p.id = auth.uid()
    where l.id = lfg_members.lfg_post_id and p.community_id = l.community_id
  )
);

create policy "lfg_members_insert_own"
on public.lfg_members for insert
to authenticated
with check (profile_id = auth.uid());

create policy "lfg_members_delete_own"
on public.lfg_members for delete
to authenticated
using (profile_id = auth.uid());

-- Announcements: read community
create policy "announcements_read_community"
on public.announcements for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.community_id = announcements.community_id
  )
);

-- Docs Documents: read if global OR in community
create policy "docs_read_global_or_community"
on public.docs_documents for select
to authenticated
using (
  (community_id is null)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.community_id = docs_documents.community_id
  )
);

-- Integration Config: no read access for now (admin-only later)
-- (No select policy = no access for regular users)

-- Update existing RLS policies to account for community_id

-- Update events policies to check community_id
drop policy if exists "Public read events" on public.events;
drop policy if exists "Authenticated insert events" on public.events;

create policy "events_read_community"
on public.events for select
to authenticated
using (
  community_id is null or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.community_id = events.community_id
  )
);

create policy "events_insert_authenticated"
on public.events for insert
to authenticated
with check (
  auth.role() = 'authenticated' and
  created_by = auth.uid()
);

create policy "events_update_creator"
on public.events for update
to authenticated
using (created_by = auth.uid());

create policy "events_delete_creator"
on public.events for delete
to authenticated
using (created_by = auth.uid());

-- Update lfg_posts policies
drop policy if exists "Public read lfg" on public.lfg_posts;
drop policy if exists "Authenticated insert lfg" on public.lfg_posts;

create policy "lfg_posts_read_community"
on public.lfg_posts for select
to authenticated
using (
  community_id is null or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.community_id = lfg_posts.community_id
  )
);

create policy "lfg_posts_insert_authenticated"
on public.lfg_posts for insert
to authenticated
with check (
  auth.role() = 'authenticated' and
  created_by = auth.uid()
);

create policy "lfg_posts_update_creator"
on public.lfg_posts for update
to authenticated
using (created_by = auth.uid());

create policy "lfg_posts_delete_creator"
on public.lfg_posts for delete
to authenticated
using (created_by = auth.uid());

-- Seed Jupiter's Girth community (if it doesn't exist)
insert into public.communities (name, anchor_discord_guild_id)
values ('Jupiter''s Girth', '573823015511392268')
on conflict (anchor_discord_guild_id) do nothing;
