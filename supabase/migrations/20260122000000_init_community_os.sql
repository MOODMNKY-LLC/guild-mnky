create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz,
  roles text[] default '{}'::text[],
  slots_total integer,
  slots_filled integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.lfg_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  window_text text,
  intent text,
  slots_total integer,
  slots_filled integer default 0,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  notion_id text unique,
  title text not null,
  tag text,
  updated_at timestamptz,
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.roster_members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  role text,
  focus text,
  is_officer boolean default false,
  created_at timestamptz default now()
);

alter table public.events enable row level security;
alter table public.lfg_posts enable row level security;
alter table public.guides enable row level security;
alter table public.roster_members enable row level security;

create policy "Public read events"
  on public.events for select
  using (true);

create policy "Public read lfg"
  on public.lfg_posts for select
  using (true);

create policy "Public read guides"
  on public.guides for select
  using (true);

create policy "Public read roster"
  on public.roster_members for select
  using (true);

create policy "Authenticated insert events"
  on public.events for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated insert lfg"
  on public.lfg_posts for insert
  with check (auth.role() = 'authenticated');
