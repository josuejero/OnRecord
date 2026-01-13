-- PHASE 6 — Assets + export + audit

-- 1) Storage buckets
insert into storage.buckets (id, name, public)
values
  ('public-recap-assets', 'public-recap-assets', true),
  ('private-session-assets', 'private-session-assets', false)
on conflict (id) do nothing;

-- 2) Storage access control
do $$
begin
  alter table storage.objects owner to postgres;
  alter table storage.objects enable row level security;
  alter table storage.objects owner to supabase_storage_admin;
exception
  when insufficient_privilege then
    raise notice 'Skipping storage RLS bootstrap: %', sqlerrm;
end;
$$;

-- Public recap assets: anyone can read; only staff/moderator can write
do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'storage_public_recap_assets_read'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_public_recap_assets_read
    on storage.objects
    for select
    using (bucket_id = 'public-recap-assets');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'storage_public_recap_assets_write'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_public_recap_assets_write
    on storage.objects
    for insert
    with check (
      bucket_id = 'public-recap-assets'
      and public.has_any_role(array['moderator','staff','admin_service'])
      and name like 'sessions/%'
    );
  end if;
end;
$$;

-- Private session assets: staff/moderator read and write
do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'storage_private_session_assets_read'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_private_session_assets_read
    on storage.objects
    for select
    using (
      bucket_id = 'private-session-assets'
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
    where polname = 'storage_private_session_assets_write'
      and polrelid = 'storage.objects'::regclass
  ) then
    create policy storage_private_session_assets_write
    on storage.objects
    for insert
    with check (
      bucket_id = 'private-session-assets'
      and public.has_any_role(array['moderator','staff','admin_service'])
      and name like 'sessions/%'
    );
  end if;
end;
$$;

-- No UPDATE or DELETE policies for storage.objects in Phase 6.


-- 3) Assets metadata table
create table if not exists public.assets (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  visibility text not null check (visibility in ('public','private')),
  bucket_id text not null,
  object_path text not null,
  public_url text,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text not null check (length(sha256) = 64),
  original_filename text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint assets_visibility_bucket_match check (
    (visibility = 'public' and bucket_id = 'public-recap-assets')
    or (visibility = 'private' and bucket_id = 'private-session-assets')
  ),

  constraint assets_public_url_match check (
    (visibility = 'public' and public_url is not null)
    or (visibility = 'private' and public_url is null)
  )
);

create unique index if not exists assets_bucket_object_unique
  on public.assets(bucket_id, object_path);

create index if not exists assets_session_visibility_created_at
  on public.assets(session_id, visibility, created_at desc);

alter table public.assets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'assets_select_staff'
      and polrelid = 'public.assets'::regclass
  ) then
    create policy assets_select_staff
    on public.assets
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
    where polname = 'assets_insert_staff'
      and polrelid = 'public.assets'::regclass
  ) then
    create policy assets_insert_staff
    on public.assets
    for insert
    with check (public.has_any_role(array['moderator','staff','admin_service']));
  end if;
end;
$$;

-- No UPDATE or DELETE policies on assets.


-- 4) Immutability helpers (audit + assets)
create or replace function public.prevent_mutation_unless_service_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    raise exception 'immutable_table: % is append-only', tg_table_name;
  end if;
  return old;
end;
$$;

drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable
before update or delete
on public.audit_events
for each row
execute function public.prevent_mutation_unless_service_role();

drop trigger if exists assets_immutable on public.assets;
create trigger assets_immutable
before update or delete
on public.assets
for each row
execute function public.prevent_mutation_unless_service_role();


-- 5) Public recap now returns public assets
create or replace function public.get_public_recap(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recap record;
  v_items jsonb;
  v_assets jsonb;
begin
  select
    rp.slug,
    rp.title,
    rp.summary,
    rp.published_at,
    rp.session_id,
    s.status as session_status,
    s.starts_at,
    s.ends_at,
    pf.slug as public_figure_slug,
    pf.name as public_figure_name,
    r.slug as room_slug,
    r.title as room_title
  into v_recap
  from recap_pages rp
  join sessions s on s.id = rp.session_id
  join rooms r on r.id = s.room_id
  join public_figures pf on pf.id = r.public_figure_id
  where rp.slug = p_slug;

  if not found or v_recap.published_at is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_body', q.body,
        'answer_body', a.body,
        'asked_at', q.created_at,
        'answered_at', a.created_at,
        'sort_rank', q.sort_rank
      )
      order by q.sort_rank asc, q.created_at asc
    ),
    '[]'::jsonb
  )
  into v_items
  from questions q
  join answers a on a.question_id = q.id
  where q.session_id = v_recap.session_id
    and q.status in ('approved','answered')
    and a.body is not null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ast.id,
        'public_url', ast.public_url,
        'mime_type', ast.mime_type,
        'byte_size', ast.byte_size,
        'sha256', ast.sha256,
        'original_filename', ast.original_filename,
        'created_at', ast.created_at
      )
      order by ast.created_at asc, ast.object_path asc
    ),
    '[]'::jsonb
  )
  into v_assets
  from assets ast
  where ast.session_id = v_recap.session_id
    and ast.visibility = 'public'
    and ast.public_url is not null;

  return jsonb_build_object(
    'recap', to_jsonb(v_recap),
    'items', v_items,
    'assets', v_assets
  );
end;
$$;

revoke all on function public.get_public_recap(text) from public;
grant execute on function public.get_public_recap(text) to anon, authenticated;
