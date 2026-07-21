-- CONDUIT cloud schema — projects, custom devices, share links, contribution
-- queue. Run in the Supabase SQL editor (or `supabase db push`) after creating
-- the project. Row-Level Security makes ownership + sharing declarative.

create extension if not exists pgcrypto;

-- ── updated_at helper ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── profiles (one per user, carries the plan) ────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── projects (a saved rig; state is the serialized canvas) ───────────────────
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'Untitled Rig',
  state      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects(owner);
alter table public.projects enable row level security;

create policy "projects: owner all" on public.projects
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ── custom devices (the user's personal library) ─────────────────────────────
create table if not exists public.custom_devices (
  id         text primary key,          -- e.g. "custom/acme-sdi-hdmi"
  owner      uuid not null references auth.users(id) on delete cascade,
  device     jsonb not null,            -- a conduit/v1 profile
  created_at timestamptz not null default now()
);

create index if not exists custom_devices_owner_idx on public.custom_devices(owner);
alter table public.custom_devices enable row level security;

create policy "custom_devices: owner all" on public.custom_devices
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- ── share links (unguessable token → read-only project) ──────────────────────
create table if not exists public.project_shares (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner      uuid not null references auth.users(id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  role       text not null default 'viewer',
  created_at timestamptz not null default now()
);

create index if not exists project_shares_project_idx on public.project_shares(project_id);
alter table public.project_shares enable row level security;

-- Only the owner manages share links; public read is via the RPC below (so the
-- table itself is never exposed).
create policy "project_shares: owner all" on public.project_shares
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Resolve a share token to a read-only project. security definer so anonymous
-- viewers can read exactly the shared row and nothing else.
create or replace function public.get_shared_project(share_token text)
returns table (name text, state jsonb)
language sql security definer set search_path = public stable as $$
  select p.name, p.state
  from public.project_shares s
  join public.projects p on p.id = s.project_id
  where s.token = share_token
  limit 1;
$$;

grant execute on function public.get_shared_project(text) to anon, authenticated;

-- ── contribution queue (Phase D — condu-scraper flywheel) ────────────────────
create table if not exists public.device_contributions (
  id          uuid primary key default gen_random_uuid(),
  submitter   uuid references auth.users(id) on delete set null,
  device      jsonb not null,           -- submitted conduit/v1 profile
  source_urls text[] not null default '{}',
  status      text not null default 'pending',  -- pending → verified → published
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.device_contributions enable row level security;

-- Users see + submit their own contributions; the scraper/admin uses the
-- service-role key which bypasses RLS to verify and publish.
create policy "contributions: read own"   on public.device_contributions for select using (auth.uid() = submitter);
create policy "contributions: insert own" on public.device_contributions for insert with check (auth.uid() = submitter);

drop trigger if exists contributions_set_updated_at on public.device_contributions;
create trigger contributions_set_updated_at before update on public.device_contributions
  for each row execute function public.set_updated_at();
