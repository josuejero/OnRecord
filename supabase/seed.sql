insert into public.demo_ping default values;

-- Demo content: one public figure, one room, one scheduled session
with pf as (
  insert into public.public_figures (slug, name)
  values ('demo-figure', 'Demo Public Figure')
  on conflict (slug) do update set name = excluded.name
  returning id
), room as (
  insert into public.rooms (public_figure_id, slug, title)
  select pf.id, 'demo-room', 'Press Room: Demo'
  from pf
  on conflict (public_figure_id, slug) do update set title = excluded.title
  returning id
)
insert into public.sessions (room_id, status)
select room.id, 'scheduled'
from room;

-- Optional: insert a sample transcript for demo (Phase 8)
insert into public.session_transcripts(session_id, source, raw_text, cleaned_text, processed_at)
select
  s.id,
  'import',
  $$
REPORTER: Thanks for taking questions. Can you clarify the timeline for the policy rollout?
SPOKESPERSON: We'll publish a detailed timeline next week, with milestones and public comment windows.
REPORTER: What data will be used to evaluate success?
SPOKESPERSON: We'll report outcomes monthly, including access, cost, and quality indicators.
  $$,
  $$
REPORTER: Thanks for taking questions. Can you clarify the timeline for the policy rollout?
SPOKESPERSON: We'll publish a detailed timeline next week, with milestones and public comment windows.
REPORTER: What data will be used to evaluate success?
SPOKESPERSON: We'll report outcomes monthly, including access, cost, and quality indicators.
  $$,
  now()
from public.sessions s
order by s.created_at desc
limit 1;
