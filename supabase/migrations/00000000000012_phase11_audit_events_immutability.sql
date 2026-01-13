-- Phase 11: enforce audit_events immutability via RLS

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'audit_events_update_service_role'
      and polrelid = 'public.audit_events'::regclass
  ) then
    create policy audit_events_update_service_role
    on public.audit_events
    for update
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy
    where polname = 'audit_events_delete_service_role'
      and polrelid = 'public.audit_events'::regclass
  ) then
    create policy audit_events_delete_service_role
    on public.audit_events
    for delete
    using (auth.role() = 'service_role');
  end if;
end;
$$;
