-- Phase 9 — AI outputs / labels / audio
-- 1) Allow voice transcripts and capture metadata.
alter table public.session_transcripts
  drop constraint if exists session_transcripts_source_check;

alter table public.session_transcripts
  add constraint session_transcripts_source_check check (source in ('manual','upload','import','voice'));

-- 2) Audio storage bucket (private, signed-only access).
insert into storage.buckets (id, name, public)
values ('session-audio', 'session-audio', false)
on conflict (id) do nothing;

-- Enforce audio bucket access and path structure via storage policies.
do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'storage_session_audio_read'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_session_audio_read
    on storage.objects
    for select
    using (
      bucket_id = 'session-audio'
      and public.has_any_role(array['moderator','staff','admin_service'])
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'storage_session_audio_write'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_session_audio_write
    on storage.objects
    for insert
    with check (
      bucket_id = 'session-audio'
      and public.has_any_role(array['moderator','staff','admin_service'])
      and name like 'rooms/%/sessions/%/audio/%'
    );
  end if;
end;
$$;

-- 3) Audio metadata table.
create table if not exists public.session_audio_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  duration_ms int not null check (duration_ms >= 0),
  transcript_id uuid references public.session_transcripts(session_id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists session_audio_assets_session_id_idx
  on public.session_audio_assets(session_id);

create index if not exists session_audio_assets_created_at_idx
  on public.session_audio_assets(created_at);

alter table public.session_audio_assets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'session_audio_assets_select_staff'
      and polrelid = 'public.session_audio_assets'::regclass
  ) then
    create policy session_audio_assets_select_staff
    on public.session_audio_assets
    for select
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'session_audio_assets_insert_staff'
      and polrelid = 'public.session_audio_assets'::regclass
  ) then
    create policy session_audio_assets_insert_staff
    on public.session_audio_assets
    for insert
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'session_audio_assets_update_staff'
      and polrelid = 'public.session_audio_assets'::regclass
  ) then
    create policy session_audio_assets_update_staff
    on public.session_audio_assets
    for update
    using (public.has_any_role(array['moderator','staff','admin_service']))
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'session_audio_assets_delete_staff'
      and polrelid = 'public.session_audio_assets'::regclass
  ) then
    create policy session_audio_assets_delete_staff
    on public.session_audio_assets
    for delete
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'session_audio_assets_deny_anon'
      and polrelid = 'public.session_audio_assets'::regclass
  ) then
    create policy session_audio_assets_deny_anon
    on public.session_audio_assets
    for all
    to anon
    using (false)
    with check (false);
  end if;
end;
$$;

-- 4) AI outputs metadata.
create table if not exists public.transcript_ai_outputs (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  transcript_id uuid not null references public.session_transcripts(session_id) on delete cascade,
  prompt_version text not null,
  provider text not null,
  model_id text not null,
  output jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint transcript_ai_outputs_unique unique (session_id, transcript_id, prompt_version, model_id)
);

create index if not exists transcript_ai_outputs_session_id_idx
  on public.transcript_ai_outputs(session_id);

create index if not exists transcript_ai_outputs_transcript_id_idx
  on public.transcript_ai_outputs(transcript_id);

create index if not exists transcript_ai_outputs_prompt_version_idx
  on public.transcript_ai_outputs(prompt_version);

create index if not exists transcript_ai_outputs_output_idx
  on public.transcript_ai_outputs using gin (output);

alter table public.transcript_ai_outputs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_ai_outputs_select_staff'
      and polrelid = 'public.transcript_ai_outputs'::regclass
  ) then
    create policy transcript_ai_outputs_select_staff
    on public.transcript_ai_outputs
    for select
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_ai_outputs_insert_staff'
      and polrelid = 'public.transcript_ai_outputs'::regclass
  ) then
    create policy transcript_ai_outputs_insert_staff
    on public.transcript_ai_outputs
    for insert
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_ai_outputs_update_staff'
      and polrelid = 'public.transcript_ai_outputs'::regclass
  ) then
    create policy transcript_ai_outputs_update_staff
    on public.transcript_ai_outputs
    for update
    using (public.has_any_role(array['moderator','staff','admin_service']))
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_ai_outputs_delete_staff'
      and polrelid = 'public.transcript_ai_outputs'::regclass
  ) then
    create policy transcript_ai_outputs_delete_staff
    on public.transcript_ai_outputs
    for delete
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_ai_outputs_deny_anon'
      and polrelid = 'public.transcript_ai_outputs'::regclass
  ) then
    create policy transcript_ai_outputs_deny_anon
    on public.transcript_ai_outputs
    for all
    to anon
    using (false)
    with check (false);
  end if;
end;
$$;

-- 5) Span labels for transcripts.
create table if not exists public.transcript_span_labels (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  transcript_id uuid not null references public.session_transcripts(session_id) on delete cascade,
  start_offset int not null,
  end_offset int not null,
  label_type text not null,
  label_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint transcript_span_labels_start_non_negative check (start_offset >= 0),
  constraint transcript_span_labels_end_greater_than_start check (end_offset > start_offset)
);

create index if not exists transcript_span_labels_transcript_id_idx
  on public.transcript_span_labels(transcript_id);

create index if not exists transcript_span_labels_session_id_idx
  on public.transcript_span_labels(session_id);

create index if not exists transcript_span_labels_label_type_idx
  on public.transcript_span_labels(label_type);

create index if not exists transcript_span_labels_created_at_idx
  on public.transcript_span_labels(created_at);

alter table public.transcript_span_labels enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_span_labels_select_staff'
      and polrelid = 'public.transcript_span_labels'::regclass
  ) then
    create policy transcript_span_labels_select_staff
    on public.transcript_span_labels
    for select
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_span_labels_insert_staff'
      and polrelid = 'public.transcript_span_labels'::regclass
  ) then
    create policy transcript_span_labels_insert_staff
    on public.transcript_span_labels
    for insert
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_span_labels_update_staff'
      and polrelid = 'public.transcript_span_labels'::regclass
  ) then
    create policy transcript_span_labels_update_staff
    on public.transcript_span_labels
    for update
    using (public.has_any_role(array['moderator','staff','admin_service']))
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_span_labels_delete_staff'
      and polrelid = 'public.transcript_span_labels'::regclass
  ) then
    create policy transcript_span_labels_delete_staff
    on public.transcript_span_labels
    for delete
    using (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'transcript_span_labels_deny_anon'
      and polrelid = 'public.transcript_span_labels'::regclass
  ) then
    create policy transcript_span_labels_deny_anon
    on public.transcript_span_labels
    for all
    to anon
    using (false)
    with check (false);
  end if;
end;
$$;
