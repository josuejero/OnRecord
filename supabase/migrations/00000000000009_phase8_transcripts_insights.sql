-- Phase 8 — Data / Insights (Optional)
-- Transcripts + session insights.

-- 1) Transcript storage
create table if not exists public.session_transcripts (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','upload','import')),
  raw_text text not null,
  cleaned_text text,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create trigger set_updated_at_session_transcripts
before update on public.session_transcripts
for each row execute function public.set_updated_at();

alter table public.session_transcripts enable row level security;

create policy session_transcripts_select_staff
on public.session_transcripts
for select
using (public.has_any_role(array['moderator','staff','admin_service']));

create policy session_transcripts_insert_staff
on public.session_transcripts
for insert
with check (public.has_any_role(array['moderator','staff','admin_service']));

create policy session_transcripts_update_staff
on public.session_transcripts
for update
using (public.has_any_role(array['moderator','staff','admin_service']))
with check (public.has_any_role(array['moderator','staff','admin_service']));

-- Helpful indexes for future growth
-- (primary key on session_id already exists)
create index if not exists session_transcripts_processed_at_idx
on public.session_transcripts (processed_at);

-- 2) Insights storage (cacheable metrics for demos + simple dashboards)
create table if not exists public.session_insights (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  computed_at timestamptz not null default now(),

  questions_total int not null default 0,
  questions_approved int not null default 0,
  questions_answered int not null default 0,
  questions_rejected int not null default 0,
  rejection_rate numeric not null default 0,

  avg_time_to_answer_seconds numeric,
  top_terms jsonb not null default '[]'::jsonb,
  transcript_word_count int not null default 0,

  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_session_insights
before update on public.session_insights
for each row execute function public.set_updated_at();

alter table public.session_insights enable row level security;

create policy session_insights_select_staff
on public.session_insights
for select
using (public.has_any_role(array['moderator','staff','admin_service']));

create policy session_insights_insert_staff
on public.session_insights
for insert
with check (public.has_any_role(array['moderator','staff','admin_service']));

create policy session_insights_update_staff
on public.session_insights
for update
using (public.has_any_role(array['moderator','staff','admin_service']))
with check (public.has_any_role(array['moderator','staff','admin_service']));

-- 3) Recompute insights for a session (safe to re-run)
create or replace function public.refresh_session_insights(
  p_session_id uuid,
  p_top_terms jsonb default null
)
returns public.session_insights
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_approved int;
  v_answered int;
  v_rejected int;
  v_avg_answer numeric;
  v_words int;
  v_row public.session_insights;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'forbidden';
  end if;

  -- question counts
  select
    count(*) filter (where true),
    count(*) filter (where status in ('approved','answered','needs_edit')),
    count(*) filter (where status = 'answered'),
    count(*) filter (where status = 'rejected')
  into v_total, v_approved, v_answered, v_rejected
  from public.questions
  where session_id = p_session_id;

  -- avg time to answer (seconds)
  -- If your model allows multiple answers per question, consider taking MIN(answer.created_at)
  select avg(extract(epoch from (a.created_at - q.created_at)))
  into v_avg_answer
  from public.questions q
  join public.answers a on a.question_id = q.id
  where q.session_id = p_session_id;

  -- transcript word count (raw or cleaned)
  select coalesce(
    sum(array_length(regexp_split_to_array(coalesce(st.cleaned_text, st.raw_text), E'\\s+'), 1)),
    0
  )
  into v_words
  from public.session_transcripts st
  where st.session_id = p_session_id;

  insert into public.session_insights (
    session_id,
    computed_at,
    questions_total,
    questions_approved,
    questions_answered,
    questions_rejected,
    rejection_rate,
    avg_time_to_answer_seconds,
    top_terms,
    transcript_word_count
  )
  values (
    p_session_id,
    now(),
    coalesce(v_total, 0),
    coalesce(v_approved, 0),
    coalesce(v_answered, 0),
    coalesce(v_rejected, 0),
    case when coalesce(v_total, 0) = 0
      then 0
      else (coalesce(v_rejected, 0)::numeric / v_total::numeric)
    end,
    v_avg_answer,
    coalesce(p_top_terms, '[]'::jsonb),
    coalesce(v_words, 0)
  )
  on conflict (session_id) do update set
    computed_at = excluded.computed_at,
    questions_total = excluded.questions_total,
    questions_approved = excluded.questions_approved,
    questions_answered = excluded.questions_answered,
    questions_rejected = excluded.questions_rejected,
    rejection_rate = excluded.rejection_rate,
    avg_time_to_answer_seconds = excluded.avg_time_to_answer_seconds,
    top_terms = case
      when p_top_terms is null then public.session_insights.top_terms
      else excluded.top_terms
    end,
    transcript_word_count = excluded.transcript_word_count,
    updated_at = now()
  returning * into v_row;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'session_insights_refreshed',
    'session_insights',
    p_session_id::text,
    jsonb_build_object(
      'questions_total', coalesce(v_total, 0),
      'questions_rejected', coalesce(v_rejected, 0)
    )
  );

  return v_row;
end;
$$;

revoke all on function public.refresh_session_insights(uuid, jsonb) from public;
grant execute on function public.refresh_session_insights(uuid, jsonb) to authenticated;
