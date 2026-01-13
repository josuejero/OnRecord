# Demo script (Phase 7)

## Goal
Show that the product works end-to-end with seeded data, real Supabase connectivity, hardened CI, and documentation for demo reviewers.

## Setup
1) `pnpm supabase:start` → services should show healthy status (Postgres + API).
2) `pnpm supabase:reset` → clean database + schema.
3) Export keys (`pnpm exec supabase status -o env`) and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
4) `pnpm seed:users` → demo reporter/moderator/staff users are created and roles applied.
5) Populate `apps/web/.env.local` with the anon key + URL.

## Demo steps
1) **Reporter flow:** log in at `/login` as `reporter@onrecord.local` and submit a question via the queue.
   *Expected result:* question lands in the queue with status `submitted` and appears on the reporter dashboard.
2) **Moderator work:** log in at `/login` as `moderator@onrecord.local`, approve the question, add an answer, and mark the recap ready.
   *Expected result:* moderator dashboard shows the answered question and recap status toggles to published.
3) **Publish recap:** use the recap slug form to publish (e.g., `/recaps/<slug>`).
   *Expected result:* logged-out visitors can open the recap URL and see the approved answer, while unpublished content 404s.
4) **Asset validation:** upload an asset in the recap’s room, toggle visibility to `public`, and confirm it appears on the public recap.
   *Expected result:* the `public-assets` list shows the link; visiting that link as a logged-out user downloads/opens the file. Repeat for a `private` asset to confirm it stays hidden.
5) **Reviewer path:** run `pnpm ci:local` to prove format, lint, typecheck, unit tests, policy negatives, Playwright suites, and repo smoke pass locally.

## Talking points
- Why monorepo + pnpm for workspace consistency.
- Supabase for RLS, Edge Functions, and Realtime in a single stack.
- Phase 7 focus: reliability (indexes, docs, security, CI artifacts) rather than new features.
