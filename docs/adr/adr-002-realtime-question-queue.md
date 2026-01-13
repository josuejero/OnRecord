# ADR-002: Realtime question queue via Supabase Realtime + Postgres changes

- Status: accepted
- Date: 2026-01-04

## Context

Phase 3 requires moderators to see new reporter questions without refresh, while maintaining RLS-based authorization.

## Decision

- Use Supabase Realtime `postgres_changes` subscriptions on `public.questions`.
- Filter the realtime stream by `session_id`.
- Enforce authorization with RLS:
  - reporters only see their own questions
  - moderators/staff see the full queue
- Publish `public.questions` in `supabase_realtime` publication.

## Consequences

- Clients receive updates with low latency and no polling.
- RLS remains the source of truth for who can observe events.
- Local dev requires realtime to be running (Supabase local provides it).

## Alternatives considered

- Polling every N seconds (simpler but worse UX, more load).
- A custom websocket service (more code + more ops; not needed for MVP).
