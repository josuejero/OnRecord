-- Phase 7 — Hardening indexes

-- Questions queue reads
create index if not exists questions_by_session_status_rank
on public.questions (session_id, status, sort_rank);

-- Answers timeline reads
create index if not exists answers_by_session_created_at
on public.answers (session_id, created_at desc);

-- Public recap lookup
create index if not exists recap_pages_by_slug
on public.recap_pages (slug);

-- Assets listing per session
create index if not exists assets_by_session_visibility_created
on public.assets (session_id, visibility, created_at desc);

-- Audit event lookups by entity
create index if not exists audit_events_by_entity
on public.audit_events (entity_table, entity_id);

-- Optional: audit timeline for a room/session (if you frequently filter)
create index if not exists audit_events_created_at
on public.audit_events (created_at desc);
