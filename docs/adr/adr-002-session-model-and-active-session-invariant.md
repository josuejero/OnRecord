# ADR-002: Session model and active-session invariant

- Status: accepted
- Date: 2026-01-04

## Context
The product needs a clean, auditable notion of a “press session” inside a room. UI and future realtime features depend on a consistent definition of “the active session.”

We also need to prevent impossible states such as multiple simultaneous live sessions in the same room, which would break ordering semantics for questions and confuse reporters.

## Decision
- Sessions are modeled as rows in `public.sessions` linked to a `public.rooms` row.
- Session state is represented by `status in ('scheduled','live','ended')`.
- The system enforces a hard invariant: a room may have **at most one** session with `status='live'`.
- Session lifecycle transitions (start/end) are executed via Postgres RPC functions:
  - `public.start_session(uuid)`
  - `public.end_session(uuid)`

The RPC functions:
- require authentication
- require role in `moderator|staff|admin_service`
- insert `audit_events` rows for traceability

## Consequences
- The database prevents impossible states, even under concurrency.
- Moderation UI can trigger lifecycle changes without widening table write access.
- Future phases can treat “active session” as deterministic:
  - if a live session exists, it is the active session
  - otherwise, the most recent scheduled session is the next session to run

## Alternatives considered
- Allow moderators to `update sessions` directly via RLS policies (rejected for Phase 2: increases write surface area early).
- Move lifecycle logic into an Edge Function (deferred: Postgres RPC is simpler, closer to the data, and still auditable).
