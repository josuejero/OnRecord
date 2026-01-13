-- Phase 12: report failures instead of invisibly skipping audit_events mutations

create or replace function public.ensure_service_role(target_table text)
returns boolean
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'immutable_table: % is append-only', target_table;
  end if;
  return true;
end;
$$;

drop policy if exists audit_events_update_service_role on public.audit_events;
create policy audit_events_update_service_role
on public.audit_events
for update
using (public.ensure_service_role('audit_events'))
with check (public.ensure_service_role('audit_events'));

drop policy if exists audit_events_delete_service_role on public.audit_events;
create policy audit_events_delete_service_role
on public.audit_events
for delete
using (public.ensure_service_role('audit_events'));

create or replace function public.prevent_mutation_unless_service_role()
returns trigger
language plpgsql
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'immutable_table: % is append-only', tg_table_name;
  end if;
  return old;
end;
$$;
