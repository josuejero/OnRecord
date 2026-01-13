# OnRecord

A verified, person-centric press conference platform: accredited reporters join persistent rooms for a public figure, queue questions into a moderated flow, receive on-record answers, and get transcripts + assets + public recap pages.

## Demo (Phase 0)
- Home to Demo Room (mock)
- Debug page confirms DB connectivity (Supabase local)
- E2E smoke test validates navigation

## Run locally

### 1) Install
```bash
pnpm install
```

### 2) Start Supabase
```bash
pnpm supabase:start
pnpm supabase:reset
```
Copy the anon key from the Supabase output into `apps/web/.env.local` (or a root `.env.local` if you prefer) using `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_URL` from the `.env.example` file.

### 3) Start the web app
```bash
pnpm dev
```

### 4) Run quality gates
```bash
pnpm lint
pnpm typecheck
pnpm e2e
```

## Docs
* ADRs: `docs/adr/`
* API: `docs/api/openapi.yaml`
* Threat model: `docs/threat-model.md`
* Demo script: `docs/demo-script.md`
