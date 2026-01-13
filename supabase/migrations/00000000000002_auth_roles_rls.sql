-- Phase 1: Auth + roles + RLS baseline

-- Extensions
create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Core reference tables (used in later phases, defined now)
create table if not exists public.public_figures (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default extensions.gen_random_uuid(),
  public_figure_id uuid not null references public.public_figures(id) on delete cascade,
  slug text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (public_figure_id, slug)
);

create table if not exists public.sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_public_figures
before update on public.public_figures
for each row execute function public.set_updated_at();

create trigger set_updated_at_rooms
before update on public.rooms
for each row execute function public.set_updated_at();

create trigger set_updated_at_sessions
before update on public.sessions
for each row execute function public.set_updated_at();

-- Roles + identity
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reporter'
    check (role in ('reporter','moderator','staff','admin_service')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create table if not exists public.reporters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credential_status text not null default 'pending'
    check (credential_status in ('pending','approved','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_reporters
before update on public.reporters
for each row execute function public.set_updated_at();

-- Audit events (write now, use later)
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  action text not null,
  entity_table text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Trigger: create a profile + reporter record for new auth users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role, display_name)
  values (
    new.id,
    'reporter',
    coalesce(
      new.raw_user_meta_data->>'display_name',
      nullif(split_part(new.email, '@', 1), '')
    )
  )
  on conflict (user_id) do nothing;

  insert into public.reporters (user_id, credential_status)
  values (new.id, 'pending')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Role helpers (use inside RLS policies)
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = required_role
  );
$$;

create or replace function public.has_any_role(roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = any(roles)
  );
$$;

create or replace function public.is_reporter_approved()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.reporters r
    where r.user_id = auth.uid() and r.credential_status = 'approved'
  );
$$;

-- Enable RLS (deny by default)
alter table public.public_figures enable row level security;
alter table public.rooms enable row level security;
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;
alter table public.reporters enable row level security;
alter table public.audit_events enable row level security;

-- PROFILES
-- Users can read their own profile (needed for app routing decisions).
create policy profiles_select_own
on public.profiles
for select
using (auth.uid() = user_id);

-- REPORTERS
create policy reporters_select_own
on public.reporters
for select
using (auth.uid() = user_id);

-- STAFF/MODERATOR can view reporter status for accreditation flows (MVP-friendly).
create policy reporters_select_staff
on public.reporters
for select
using (public.has_any_role(array['moderator','staff','admin_service']));

-- PUBLIC_FIGURES
create policy public_figures_select_authenticated
on public.public_figures
for select
using (auth.role() = 'authenticated');

create policy public_figures_mutate_staff
on public.public_figures
for all
using (public.has_any_role(array['staff','admin_service']))
with check (public.has_any_role(array['staff','admin_service']));

-- ROOMS
-- Reporters must be approved; staff/moderator can always read.
create policy rooms_select
on public.rooms
for select
using (
  public.has_any_role(array['moderator','staff','admin_service'])
  or (public.has_role('reporter') and public.is_reporter_approved())
);

create policy rooms_mutate_staff
on public.rooms
for all
using (public.has_any_role(array['staff','admin_service']))
with check (public.has_any_role(array['staff','admin_service']));

-- SESSIONS
create policy sessions_select
on public.sessions
for select
using (
  public.has_any_role(array['moderator','staff','admin_service'])
  or (public.has_role('reporter') and public.is_reporter_approved())
);

create policy sessions_mutate_staff
on public.sessions
for all
using (public.has_any_role(array['staff','admin_service']))
with check (public.has_any_role(array['staff','admin_service']));

-- AUDIT EVENTS (write-only for staff/admin, readable for staff/admin)
create policy audit_events_select_staff
on public.audit_events
for select
using (public.has_any_role(array['staff','admin_service']));

create policy audit_events_insert_staff
on public.audit_events
for insert
with check (public.has_any_role(array['staff','admin_service']));
