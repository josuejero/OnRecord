# ADR-000: Stack + repo structure

- Status: accepted
- Date: 2026-01-04

## Context
We want a portfolio-grade system that demonstrates full-stack delivery, realtime behavior, and a production mindset.

## Decision
- Next.js (TypeScript) + Tailwind + shadcn/ui for the web app.
- Supabase for Postgres + Auth + RLS + Realtime + Storage + Edge Functions.
- Playwright for E2E smoke tests.
- GitHub Actions for CI.
- Keep ADRs, OpenAPI stubs, threat model, and changelog in-repo.

## Consequences
- Edge Functions live under `supabase/functions` to match the Supabase CLI.
- We keep the UI usable in a mock-only demo mode even before realtime is implemented.

## Alternatives considered
- Separate backend service (NestJS) instead of Edge Functions (deferred until proven necessary).
