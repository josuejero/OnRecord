-- Phase 2: Sessions invariant + lifecycle RPC

-- 1) Invariant: at most one live session per room
create unique index if not exists sessions_one_live_per_room
on public.sessions (room_id)
where status = 'live';

-- Optional ergonomics index (room timeline reads)
create index if not exists sessions_room_created_at
on public.sessions (room_id, created_at desc);

-- 2) RPC: start a session (moderator/staff/admin_service)
create or replace function public.start_session(p_session_id uuid)
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

  select * into v_session
  from public.sessions
  where id = p_session_id;

  if not found then
    raise exception 'session_not_found';
  end if;

  -- Prevent impossible state (guard before update)
  if exists (
    select 1
    from public.sessions s
    where s.room_id = v_session.room_id
      and s.status = 'live'
      and s.id <> p_session_id
  ) then
    raise exception 'live_session_already_exists_for_room';
  end if;

  update public.sessions
  set
    status = 'live',
    starts_at = coalesce(starts_at, now()),
    ends_at = null,
    updated_at = now()
  where id = p_session_id
  returning * into v_session;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'session_started',
    'sessions',
    p_session_id::text,
    jsonb_build_object('room_id', v_session.room_id)
  );

  return v_session;
end;
$$;

revoke all on function public.start_session(uuid) from public;
grant execute on function public.start_session(uuid) to authenticated;

-- 3) RPC: end a session (moderator/staff/admin_service)
create or replace function public.end_session(p_session_id uuid)
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

  select * into v_session
  from public.sessions
  where id = p_session_id;

  if not found then
    raise exception 'session_not_found';
  end if;

  update public.sessions
  set
    status = 'ended',
    ends_at = coalesce(ends_at, now()),
    updated_at = now()
  where id = p_session_id
  returning * into v_session;

  insert into public.audit_events(actor_user_id, action, entity_table, entity_id, metadata)
  values (
    auth.uid(),
    'session_ended',
    'sessions',
    p_session_id::text,
    jsonb_build_object('room_id', v_session.room_id)
  );

  return v_session;
end;
$$;

revoke all on function public.end_session(uuid) from public;
grant execute on function public.end_session(uuid) to authenticated;
