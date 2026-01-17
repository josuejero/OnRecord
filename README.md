# OnRecord

[![CI](https://github.com/josuejero/OnRecord/actions/workflows/ci.yml/badge.svg)](https://github.com/josuejero/OnRecord/actions/workflows/ci.yml) [![Lighthouse](https://img.shields.io/badge/Lighthouse-passing-brightgreen)](https://web.dev/measure) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)[![Live App](https://img.shields.io/badge/app-live-brightgreen.svg)](https://on-record-web.vercel.app )

OnRecord is the recruiter-ready press conference interface: live room control, question queues, and recap assets all share a single responsive canvas so demos, remote interviews, or async reviews load like production — even when data is slow or missing.

- Responsive, mobile-first panels stretch smoothly from phones to 4K dashboards so every recruiter sees the same polish.
- Cross-browser state fidelity keeps skeletons, cards, and dialogs consistent in Chromium, Safari, and Firefox.
- Accessibility-first interactions plus telemetry-backed debugging let UI interns trace failures, keep assistive markup intact, and ship with confidence.

## Start here

- Overview + latest demo cues: `README.md` hero, Quickstart, and “Demo sprint.”
- Runbook + evidence hub: `docs/start-here.md` routes you to the fastest UI proof.
- Always use `.env.example` as the Safe Defaults template; do not commit any real secrets.

## Quickstart

Copy the following shell block into your terminal to stand up the full local stack, then edit `apps/web/.env.local` (or a root `.env.local`) with the `NEXT_PUBLIC_SUPABASE_*` values that Supabase prints and your service role key.

```bash
pnpm install
pnpm supabase:start
pnpm supabase:reset
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY
pnpm --filter @onrecord/web exec node scripts/seed-users.mjs
pnpm --filter @onrecord/web exec node scripts/seed-demo-data.mjs
pnpm dev
```

## Demo sprint

Run `pnpm demo` and the script will start Supabase, reset + seed the demo room data, persist the necessary `NEXT_PUBLIC_SUPABASE_*` values into `apps/web/.env.local`, and finally launch `pnpm --filter @onrecord/web dev` while printing the credentials and URLs you need.

### Demo accounts

- Reporter: `reporter@onrecord.local` / `password123!`
- Moderator: `moderator@onrecord.local` / `password123!`

### What to click

- Open the first “Press Room” card from `/rooms`, then hit **Start session** to warm the queue/live session UI.
- Ask a question, approve it, and publish a recap to watch the toast + recap timeline surfaces.
- Open the public recap link inside the room to verify the published assets + transcript.

### How to reset

- `pnpm supabase:reset && pnpm seed:users` (or just re-run `pnpm demo`) to refresh the seeded accounts + data.

## Visual proof

![Room page with toast "Recap published"](docs/assets/screenshots/room-page-toast.png)  
Real-time recap flows show the transcript, toast, and recap link that recruiters care about.

![Rooms loading skeleton](docs/assets/screenshots/rooms-loading-skeleton.png)  
Responsive skeletons preserve layout across breakpoints while guard rails wait on data.

![Error boundary page with friendly retry UI](docs/assets/screenshots/error-boundary.png)  
Error boundaries, empty states, and retry affordances keep every panel recruiter-ready.

## Performance proof

![Lighthouse CI report (passing)](docs/assets/screenshots/lighthouse-report.svg)  
`pnpm lhci` runs Lighthouse CI (home + demo room) and enforces the `.lighthouseci/ci-config.js` budgets so perf, accessibility, and layout shift won’t regress on PRs.

## UI Internship Evidence

- [docs/ui-contract.md](docs/ui-contract.md) — loading, empty, error, and success patterns that match the UI intern checklist.
- [docs/ui-reliability.md](docs/ui-reliability.md) — documented failure modes plus recovery flows and telemetry.
- [docs/components.md](docs/components.md) — shared primitives that keep the form, table, and dialog UX cohesive.
- [docs/test-matrix.md](docs/test-matrix.md) — automated coverage across lint, types, Playwright, and Axe checks.
- [docs/accessibility.md](docs/accessibility.md) — accessible standards, ARIA dialog/keyboard patterns, and Axe + keyboard smoke proof.
