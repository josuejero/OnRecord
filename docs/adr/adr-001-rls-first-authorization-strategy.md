# ADR-001: RLS-first authorization strategy

- Status: proposed
- Date: 2026-01-04

## Context
OnRecord needs strong trust boundaries (reporter vs moderator vs staff) and auditability.
UI-only checks are insufficient; enforcement must be server-side.

## Decision
- Use Supabase Row Level Security (RLS) as the primary authorization layer.
- Model roles in `public.profiles.role` and reporter accreditation in `public.reporters.credential_status`.
- Default to deny-by-default policies; explicitly grant only what each role needs.
- Use small SQL helper functions (`has_role`, `has_any_role`, `is_reporter_approved`) to keep policies readable.

## Consequences
- Security is verifiable in the database (not just the UI).
- Local development requires demo users to exist (seed script or manual setup).
- Some “admin” actions should be implemented as Edge Functions (service role) rather than in the web app.
- Policy changes become “breaking changes” and should be reviewed like API changes.

## Alternatives considered
- Route-only authorization in Next.js (rejected: cannot protect direct DB/API access).
- Separate backend service for authz (deferred: Supabase RLS is sufficient for MVP).
