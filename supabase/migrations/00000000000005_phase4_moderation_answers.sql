-- Phase 4 — Moderation + Answers

-- 1) sessions.active_question_id (single “active” question per session)
alter table public.sessions
  add column if not exists active_question_id uuid;

-- FK ensures the ID points at a real question, but session match is enforced in RPC.
alter table public.sessions
  drop constraint if exists sessions_active_question_fk;

alter table public.sessions
  add constraint sessions_active_question_fk
  foreign key (active_question_id)
  references public.questions(id)
  on delete set null;

create index if not exists sessions_active_question_id_idx
  on public.sessions(active_question_id);


-- 2) answers table (one answer per question)
create table if not exists public.answers (
  id uuid primary key default extensions.gen_random_uuid(),
  question_id uuid not null unique
    references public.questions(id) on delete cascade,
  session_id uuid not null
    references public.sessions(id) on delete cascade,
  body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists answers_session_created_idx
  on public.answers(session_id, created_at);

create index if not exists answers_question_id_idx
  on public.answers(question_id);

-- updated_at trigger

drop trigger if exists answers_set_updated_at on public.answers;
create trigger answers_set_updated_at
  before update on public.answers
  for each row execute procedure public.set_updated_at();


-- 3) RLS for answers
alter table public.answers enable row level security;

-- Moderators/staff/admin_service can read all answers

drop policy if exists answers_select_moderation on public.answers;
create policy answers_select_moderation
  on public.answers
  for select
  using (public.has_any_role(array['moderator','staff','admin_service']));

-- Reporters can read answers to their own questions

drop policy if exists answers_select_reporter_own on public.answers;
create policy answers_select_reporter_own
  on public.answers
  for select
  using (
    exists (
      select 1 from public.questions q
      where q.id = answers.question_id
        and q.reporter_id = auth.uid()
    )
  );

-- Only moderators/staff/admin_service can insert/update/delete answers

drop policy if exists answers_mutate_moderation on public.answers;
create policy answers_mutate_moderation
  on public.answers
  for all
  using (public.has_any_role(array['moderator','staff','admin_service']))
  with check (public.has_any_role(array['moderator','staff','admin_service']));


-- 4) RPC: set question status (approve/reject/needs_edit)
create or replace function public.set_question_status(
  p_question_id uuid,
  p_status text,
  p_note text default null
)
returns public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.questions;
  v_new public.questions;
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  if p_status not in ('approved','rejected','needs_edit') then
    raise exception 'invalid_status';
  end if;

  select * into v_old
    from public.questions
    where id = p_question_id
    for update;

  if not found then
    raise exception 'not_found';
  end if;

  update public.questions
    set status = p_status,
        updated_at = now()
    where id = p_question_id
    returning * into v_new;

  v_action := case p_status
    when 'approved' then 'question_approved'
    when 'rejected' then 'question_rejected'
    when 'needs_edit' then 'question_needs_edit'
    else 'question_status_changed'
  end;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    v_action,
    'questions',
    p_question_id::text,
    jsonb_build_object(
      'from_status', v_old.status,
      'to_status', v_new.status,
      'note', p_note,
      'session_id', v_new.session_id,
      'reporter_id', v_new.reporter_id
    )
  );

  return v_new;
end;
$$;

revoke all on function public.set_question_status(uuid, text, text) from public;
grant execute on function public.set_question_status(uuid, text, text) to authenticated;


-- 5) RPC: reporter resubmits after needs_edit
create or replace function public.resubmit_question(
  p_question_id uuid,
  p_body text
)
returns public.questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.questions;
  v_new public.questions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_old
    from public.questions
    where id = p_question_id
    for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_old.reporter_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_old.status <> 'needs_edit' then
    raise exception 'invalid_state';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty_body';
  end if;

  update public.questions
    set body = p_body,
        status = 'pending',
        updated_at = now()
    where id = p_question_id
    returning * into v_new;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'question_resubmitted',
    'questions',
    p_question_id::text,
    jsonb_build_object(
      'from_status', v_old.status,
      'to_status', v_new.status,
      'session_id', v_new.session_id
    )
  );

  return v_new;
end;
$$;

revoke all on function public.resubmit_question(uuid, text) from public;
grant execute on function public.resubmit_question(uuid, text) to authenticated;


-- 6) RPC: reorder queue (moderator/staff/admin_service)
create or replace function public.reorder_questions(
  p_session_id uuid,
  p_question_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  if p_question_ids is null or array_length(p_question_ids, 1) is null then
    raise exception 'empty_list';
  end if;

  select count(*) into v_count
  from public.questions q
  where q.session_id = p_session_id
    and q.id = any(p_question_ids);

  if v_count <> array_length(p_question_ids, 1) then
    raise exception 'invalid_question_ids';
  end if;

  for i in 1..array_length(p_question_ids, 1) loop
    update public.questions
      set sort_rank = i * 1000,
          updated_at = now()
      where id = p_question_ids[i];
  end loop;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'queue_reordered',
    'sessions',
    p_session_id::text,
    jsonb_build_object('question_ids', p_question_ids)
  );
end;
$$;

revoke all on function public.reorder_questions(uuid, uuid[]) from public;
grant execute on function public.reorder_questions(uuid, uuid[]) to authenticated;


-- 7) RPC: set/clear active question
create or replace function public.set_active_question(
  p_session_id uuid,
  p_question_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question public.questions;
  v_session public.sessions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  select * into v_question
    from public.questions
    where id = p_question_id;

  if not found then
    raise exception 'question_not_found';
  end if;

  if v_question.session_id <> p_session_id then
    raise exception 'question_wrong_session';
  end if;

  if v_question.status <> 'approved' then
    raise exception 'question_not_approved';
  end if;

  update public.sessions
    set active_question_id = p_question_id,
        updated_at = now()
    where id = p_session_id
    returning * into v_session;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'active_question_set',
    'sessions',
    p_session_id::text,
    jsonb_build_object('question_id', p_question_id)
  );

  return v_session;
end;
$$;

revoke all on function public.set_active_question(uuid, uuid) from public;
grant execute on function public.set_active_question(uuid, uuid) to authenticated;


create or replace function public.clear_active_question(
  p_session_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  update public.sessions
    set active_question_id = null,
        updated_at = now()
    where id = p_session_id
    returning * into v_session;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'active_question_cleared',
    'sessions',
    p_session_id::text,
    '{}'::jsonb
  );

  return v_session;
end;
$$;

revoke all on function public.clear_active_question(uuid) from public;
grant execute on function public.clear_active_question(uuid) to authenticated;


-- 8) RPC: post an answer (requires approved question)
create or replace function public.post_answer(
  p_question_id uuid,
  p_body text
)
returns public.answers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question public.questions;
  v_answer public.answers;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty_answer';
  end if;

  select * into v_question
    from public.questions
    where id = p_question_id
    for update;

  if not found then
    raise exception 'not_found';
  end if;

  if v_question.status <> 'approved' then
    raise exception 'question_not_approved';
  end if;

  insert into public.answers(question_id, session_id, body, created_by)
  values (v_question.id, v_question.session_id, p_body, auth.uid())
  returning * into v_answer;

  update public.questions
    set status = 'answered',
        updated_at = now()
    where id = v_question.id;

  -- If it was active, clear it.
  update public.sessions
    set active_question_id = null,
        updated_at = now()
    where id = v_question.session_id
      and active_question_id = v_question.id;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'answer_posted',
    'answers',
    v_answer.id::text,
    jsonb_build_object(
      'question_id', v_question.id,
      'session_id', v_question.session_id
    )
  );

  return v_answer;
end;
$$;

revoke all on function public.post_answer(uuid, text) from public;
grant execute on function public.post_answer(uuid, text) to authenticated;


-- 9) Realtime
-- Safely add tables to publication (ignore if already added)
do $$
begin
  alter publication supabase_realtime add table public.answers;
exception when duplicate_object then
  null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception when duplicate_object then
  null;
end;
$$;
