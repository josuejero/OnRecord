-- Phase 3: Questions (submission + realtime queue)

-- QUESTIONS
create table if not exists public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  body text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','needs_edit','answered')),

  -- Deterministic queue ordering:
  -- - sort_rank is an integer that can be used later for moderation/reordering.
  -- - newly submitted questions get an auto-assigned sort_rank in arrival order.
  sort_rank int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Simple, DB-enforced body constraint (tunable)
  constraint questions_body_len check (char_length(body) between 1 and 500)
);

-- updated_at trigger
create trigger set_updated_at_questions
before update on public.questions
for each row execute function public.set_updated_at();

-- 1) Assign sort_rank in a session-stable way
--    (ensures deterministic ordering even with concurrent inserts)
create or replace function public.assign_question_sort_rank()
returns trigger
language plpgsql
as $$
declare
  v_next int;
begin
  -- per-session lock for stable ordering
  perform pg_advisory_xact_lock(hashtext(new.session_id::text));

  if new.sort_rank <> 0 then
    -- Only moderation later should set sort_rank; reporter inserts must be 0 by policy.
    return new;
  end if;

  select coalesce(max(q.sort_rank), 0) + 1
    into v_next
  from public.questions q
  where q.session_id = new.session_id;

  new.sort_rank := v_next;
  return new;
end;
$$;

drop trigger if exists questions_assign_sort_rank on public.questions;
create trigger questions_assign_sort_rank
before insert on public.questions
for each row execute function public.assign_question_sort_rank();

-- 2) Abuse constraints (cooldown + per-minute cap)
create or replace function public.enforce_question_rate_limits()
returns trigger
language plpgsql
as $$
declare
  v_recent_count int;
begin
  -- Cooldown: 1 question per 10 seconds per (reporter, session)
  if exists (
    select 1
    from public.questions q
    where q.session_id = new.session_id
      and q.reporter_id = new.reporter_id
      and q.created_at > now() - interval '10 seconds'
  ) then
    raise exception 'rate_limited_cooldown';
  end if;

  -- Per-minute cap: max 5 questions per minute per (reporter, session)
  select count(*)
    into v_recent_count
  from public.questions q
  where q.session_id = new.session_id
    and q.reporter_id = new.reporter_id
    and q.created_at > now() - interval '1 minute';

  if v_recent_count >= 5 then
    raise exception 'rate_limited_per_minute';
  end if;

  return new;
end;
$$;

drop trigger if exists questions_rate_limit on public.questions;
create trigger questions_rate_limit
before insert on public.questions
for each row execute function public.enforce_question_rate_limits();

-- Useful indexes
create index if not exists questions_session_status_sort_created
on public.questions (session_id, status, sort_rank, created_at);

create index if not exists questions_reporter_session_created
on public.questions (reporter_id, session_id, created_at desc);

-- Enable RLS (deny by default)
alter table public.questions enable row level security;

-- SELECT
-- Reporters can only read their own questions.
create policy questions_select_own
on public.questions
for select
using (auth.uid() = reporter_id);

-- Moderator/staff/admin can read the full queue.
create policy questions_select_moderation
on public.questions
for select
using (public.has_any_role(array['moderator','staff','admin_service']));

-- INSERT
-- Approved reporters can submit questions only for *live* sessions.
-- Must submit as pending with sort_rank=0 (DB assigns final sort_rank).
create policy questions_insert_reporter
on public.questions
for insert
with check (
  public.has_role('reporter')
  and public.is_reporter_approved()
  and reporter_id = auth.uid()
  and status = 'pending'
  and sort_rank = 0
  and exists (
    select 1
    from public.sessions s
    where s.id = session_id
      and s.status = 'live'
  )
);

-- UPDATE
-- Only moderation roles can update (for Phase 4+ status changes/reordering).
create policy questions_update_moderation
on public.questions
for update
using (public.has_any_role(array['moderator','staff','admin_service']))
with check (public.has_any_role(array['moderator','staff','admin_service']));

-- DELETE
-- Optional: only staff/admin can delete.
create policy questions_delete_staff
on public.questions
for delete
using (public.has_any_role(array['staff','admin_service']));

-- Realtime: ensure the table is in the publication (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'questions'
  ) then
    execute 'alter publication supabase_realtime add table public.questions';
  end if;
end;
$$;
