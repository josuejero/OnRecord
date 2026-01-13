# Threat model

## Scope

OnRecord is a press-conference workflow app that orchestrates:

- authenticated reporters + moderators
- realtime question queue with moderation
- published public recap pages
- asset storage (public + private buckets)
- audit logging for critical actions

## Assets to protect

- Identity + role assignments (profiles, roles)
- Reporter credentials + approval state
- Question/answer integrity (no tampering, no silent edits)
- Publication boundary (what is public vs private)
- Storage objects (private assets must stay private)
- Audit events (integrity + retention)

## Trust boundaries

- Browser client: untrusted input + hostile runtime
- Next.js server routes/actions: trusted runtime, must validate inputs
- Supabase: trusted platform, but policies must enforce access controls
- Public recap surface: treated as internet-facing

## Primary threats + mitigations

### 1) Secrets exposure

**Threat:** service role key or JWT secret leaks into git/browser.
**Mitigations:**

- Never ship service role keys to the browser.
- `.env.local` is ignored by git; public docs call attention to sensitive vars.
- CI gating + review checklist keep secrets out of commits.

### 2) Authorization bypass

**Threat:** RLS policies too permissive so reporters or anonymous users modify restricted data.
**Mitigations:**

- RLS enabled on every table and storage bucket.
- Role helpers (`has_any_role`) gate privileged RPCs and mutations.
- `apps/web/scripts/rls-negative-tests.mjs` runs in CI to prove denials.

### 3) Public/private boundary failure

**Threat:** private session content shows up on public recap pages or assets leak.
**Mitigations:**

- Public recap pages query only `published_at is not null`.
- Assets are rendered publicly only if marked `public` and stored in a public bucket.
- Playwright tests cover public recap access and asset visibility.

### 4) XSS / injection

**Threat:** untrusted text rendered dangerously.
**Mitigations:**

- Render user inputs as plain text; no `dangerouslySetInnerHTML`.
- Validate slugs/IDs on the server and constrain formats via Zod.

### 5) Realtime abuse

**Threat:** flood question queue / abuse moderation realtime channels.
**Mitigations:**

- Realtime publication only emits approved events from RPCs.
- Server-side RPCs enforce invariants (single active session, queued question state).

## Security regression tests

- Policy negative tests (`apps/web/scripts/rls-negative-tests.mjs`) run in CI.
- Playwright suite validates public/private behavior and asset visibility.

## Future hardening (post Phase 7)

- Rate limits on write endpoints and RTC channels.
- Content moderation for public recap submissions.
- Audit event retention/export policies.
- Optional WAF/CDN rules if deployed on a public domain.
