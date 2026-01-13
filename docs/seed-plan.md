# Seed plan

## Purpose

Phase 0 just needs a reliable connectivity check, so we keep the schema minimal and the seed focused on `demo_ping`.

## Seed data

- Table `public.demo_ping` (id, inserted_at)
- One row inserted via `supabase db reset`, letting Postgres assign the timestamp
