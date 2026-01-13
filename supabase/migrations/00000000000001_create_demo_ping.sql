create table if not exists public.demo_ping (
  id bigint generated always as identity primary key,
  inserted_at timestamptz not null default now()
);

alter table public.demo_ping enable row level security;

create policy "demo_ping_read" on public.demo_ping
  for select
  using (true);
