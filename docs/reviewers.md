# Reviewer quickstart

This is the fastest path to run the demo locally and verify quality gates.

## 1) Install + start
```bash
pnpm install
pnpm supabase:start
pnpm supabase:reset
```

## 2) Export keys
```bash
pnpm exec supabase status -o env
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"
```

## 3) Seed demo users
```bash
pnpm seed:users
```

## 4) Set web env
Create `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste ANON_KEY>
```

## 5) Run
```bash
pnpm dev
```

## Demo accounts
* reporter: `reporter@onrecord.local` / `password123!`
* moderator: `moderator@onrecord.local` / `password123!`
* staff: `staff@onrecord.local` / `password123!`

## Quality gates
```bash
pnpm ci:local
```

## Manual accessibility checklist
* Keyboard-only navigation can reach the primary nav, submit buttons, and moderator actions.
* Visible focus states exist for interactive controls.
* Form inputs have descriptive labels.
* Body text and controls meet reasonable color contrast.
* Modal dialogs trap focus and close with Escape.
