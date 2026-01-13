-- Phase 5 — Public recap pages (SEO-friendly)

-- Optional: validate slug format (simple lowercase + hyphens)
-- You can relax this if you support unicode slugs.
create or replace function public.is_valid_slug(p text)
returns boolean
language sql
immutable
as $$
  select p ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$';
$$;

-- 1) Recap pages (publish surface + stable slug)
create table if not exists public.recap_pages (
  id uuid primary key default extensions.gen_random_uuid(),

  session_id uuid not null unique
    references public.sessions(id) on delete cascade,

  slug text not null unique,
  title text not null,
  summary text,

  -- When NULL: not publicly accessible.
  published_at timestamptz,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recap_pages_slug_len check (char_length(slug) between 3 and 120),
  constraint recap_pages_slug_format check (public.is_valid_slug(slug))
);

create trigger recap_pages_set_updated_at
before update on public.recap_pages
for each row execute function public.set_updated_at();

create index if not exists recap_pages_published_at_idx
on public.recap_pages (published_at desc);

-- 2) RLS
alter table public.recap_pages enable row level security;

-- Public can read only published recap rows.
drop policy if exists recap_pages_select_published_anon on public.recap_pages;
create policy recap_pages_select_published_anon
on public.recap_pages
for select
to anon
using (published_at is not null);

-- Signed-in users can read published recaps too.
drop policy if exists recap_pages_select_published_auth on public.recap_pages;
create policy recap_pages_select_published_auth
on public.recap_pages
for select
to authenticated
using (published_at is not null);

-- Staff/moderator/admin_service can read all (including unpublished).
drop policy if exists recap_pages_select_staff on public.recap_pages;
create policy recap_pages_select_staff
on public.recap_pages
for select
to authenticated
using (public.has_any_role(array['moderator','staff','admin_service']));

-- Only moderator/staff/admin_service can mutate.
drop policy if exists recap_pages_mutate_staff on public.recap_pages;
create policy recap_pages_mutate_staff
on public.recap_pages
for all
to authenticated
using (public.has_any_role(array['moderator','staff','admin_service']))
with check (public.has_any_role(array['moderator','staff','admin_service']));

-- 3) RPC: publish/unpublish
create or replace function public.publish_recap(
  p_session_id uuid,
  p_slug text,
  p_title text,
  p_summary text default null
)
returns public.recap_pages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.recap_pages;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'not_authorized';
  end if;

  if not public.is_valid_slug(p_slug) then
    raise exception 'invalid_slug';
  end if;

  insert into public.recap_pages (session_id, slug, title, summary, published_at, created_by)
  values (p_session_id, p_slug, p_title, p_summary, now(), auth.uid())
  on conflict (session_id) do update set
    slug = excluded.slug,
    title = excluded.title,
    summary = excluded.summary,
    published_at = coalesce(public.recap_pages.published_at, now()),
    updated_at = now();

  select * into v_row from public.recap_pages where session_id = p_session_id;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'recap_published',
    'recap_pages',
    v_row.id::text,
    jsonb_build_object('session_id', p_session_id::text, 'slug', p_slug)
  );

  return v_row;
end;
$$;

revoke all on function public.publish_recap(uuid, text, text, text) from public;
grant execute on function public.publish_recap(uuid, text, text, text) to authenticated;

create or replace function public.unpublish_recap(p_session_id uuid)
returns public.recap_pages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.recap_pages;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.has_any_role(array['moderator','staff','admin_service']) then
    raise exception 'not_authorized';
  end if;

  update public.recap_pages
  set published_at = null,
      updated_at = now()
  where session_id = p_session_id
  returning * into v_row;

  if not found then
    raise exception 'not_found';
  end if;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'recap_unpublished',
    'recap_pages',
    v_row.id::text,
    jsonb_build_object('session_id', p_session_id::text, 'slug', v_row.slug)
  );

  return v_row;
end;
$$;

revoke all on function public.unpublish_recap(uuid) from public;
grant execute on function public.unpublish_recap(uuid) to authenticated;

-- 4) RPC: public recap read model (no login)
-- Returns a JSON object:
-- { recap: {...}, items: [{question_body, answer_body, asked_at, answered_at, sort_rank}, ...] }
create or replace function public.get_public_recap(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recap public.recap_pages;
  v_session public.sessions;
  v_room public.rooms;
  v_pf public.public_figures;
  v_items jsonb;
begin
  select *
  into v_recap
  from public.recap_pages
  where slug = p_slug
    and published_at is not null;

  if not found then
    return null;
  end if;

  select * into v_session from public.sessions where id = v_recap.session_id;
  select * into v_room from public.rooms where id = v_session.room_id;
  select * into v_pf from public.public_figures where id = v_room.public_figure_id;

  -- Only approved/answered questions are included.
  -- IMPORTANT: Do not return reporter_id or internal moderation fields.
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
  from public.questions q
  left join public.answers a on a.question_id = q.id
  where q.session_id = v_recap.session_id
    and q.status in ('approved','answered');

  return jsonb_build_object(
    'recap', jsonb_build_object(
      'slug', v_recap.slug,
      'title', v_recap.title,
      'summary', v_recap.summary,
      'published_at', v_recap.published_at,
      'session_id', v_recap.session_id,
      'session_status', v_session.status,
      'starts_at', v_session.starts_at,
      'ends_at', v_session.ends_at,
      'public_figure_slug', v_pf.slug,
      'public_figure_name', v_pf.name,
      'room_slug', v_room.slug,
      'room_title', v_room.title
    ),
    'items', v_items
  );
end;
$$;

revoke all on function public.get_public_recap(text) from public;
-- Allow anon to execute (no-login recap pages)
grant execute on function public.get_public_recap(text) to anon;
grant execute on function public.get_public_recap(text) to authenticated;
