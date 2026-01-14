# UI Reliability Proof

This document captures the reliability work that brings the OnRecord UI closer to true production quality. Every failure mode listed below includes how we detect it, what the user sees, how we recover, the telemetry we surface, and the tests that validate the experience.

## Failure-mode matrix

| Failure Mode                                          | Trigger / Detection                                                                      | User-facing Behavior                                                                                                    | Recovery                                                                                         | Telemetry                                                            | Test Coverage                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1. Network offline / flaky networking                 | `navigator.onLine` + `window` `online` / `offline` events                                | Top banner: “You’re offline. Changes may not sync.” Network-dependent buttons disabled or relabeled to “Queue locally.” | Banner flips to “Back online” + fade; “Retry” buttons (uploads, publish) re-enable automatically | `ui/network-status` events with `offline` / `online` states          | E2E offline scenario + unit tests for button states                              |
| 2. Auth expiry / missing session                      | Supabase client errors from `realtime`/upload calls, `supabase.auth.getUser()` rejection | Toast: “Session expired, please sign in again.” Dedicated “Go to login” button (re-usable component).                   | Redirect to `/login` flows, toast stays until action                                             | `auth/session-expired` counter, `auth/relogin` funnel                | Automated auth error mock + manual verification of toast + redirect              |
| 3. Real-time disconnect (QuestionQueue subscriptions) | Postgres channel disconnect + `QuestionQueueClient` error boundary                       | Panel chip states: “Live”, “Reconnecting…”, “Disconnected”; fallback feature panel via `ClientErrorBoundary`            | Automatic retry with backoff; “Reconnect” button when retries exhausted                          | `realtime/status` with `connected` / `reconnecting` / `disconnected` | Integration test that kills/restarts realtime feed; UI test for reconnect button |
| 4. Slow queries / cold starts                         | Routing `loading.tsx` timeouts and Suspense boundaries (Next.js)                         | Skeletons before content, plus “Still working…” copy after ~2–3s for long panels                                        | Content renders as soon as data arrives; “Still working…” disappears                             | `performance/route-loading-delay` with duration buckets              | Lab test with simulated cold start + visual regression for skeletons             |
| 5. Permission / role issues                           | Server redirect to `/whoami` + client role checks                                        | `/whoami` explains current user identity, role, and accessible pages; guidance for demo users                           | Role-based guard shows call-to-action (contact/upgrade) + fallback instructions                  | `auth/access-denied` events with role metadata                       | Smoke test hitting restricted routes; verify `/whoami` content                   |

## Failure-mode details

### 1. Network offline / flaky networking

- **Trigger / detection:** `navigator.onLine` and `window` `offline` / `online` events keep the page aware of connectivity changes.
- **User-facing behavior:** Small banner anchored above the main content shows “You’re offline. Changes may not sync.” Buttons that require the network (uploads, publish) either disable or switch to a “Queue locally” affordance so the user can still take action.
- **Recovery:** When the browser reports `online` again, the banner flips to “Back online”, fades out, and retryable controls become active (uploads/publish can be retried, queue items flush).
- **Telemetry:** Emit `ui/network-status` events with `offline`/`online` payloads, including queue length when reconnecting.
- **Test coverage:** E2E test enters offline mode and verifies the banner plus disabled controls; unit test covers button state transitions triggered by simulated events.

### 2. Auth expiry / session missing

- **Trigger / detection:** Supabase auth calls (`supabase.auth.getUser()`, realtime subscriptions, upload mutations) reject when the session expires or is absent.
- **User-facing behavior:** A toast pops up saying “Session expired, please sign in again.” A helper button (“Go to login”) appears in-context so the user can re-authenticate immediately.
- **Recovery:** Toast directs the user to `/login`; server components already redirect there when `supabase.auth.getUser()` fails. The UI toast stays up until the user takes action.
- **Telemetry:** Track `auth/session-expired` with source (realtime, upload) and `auth/relogin` resolution events.
- **Test coverage:** Mock Supabase auth failures in unit tests to assert toast + button render; manual validation ensures server redirects keep the user looped into the login flow.

### 3. Real-time disconnect (QuestionQueue subscriptions)

- **Trigger / detection:** `QuestionQueueClient.tsx` subscriptions to `postgres_changes` channels report disconnects; the wrapper component records `reconnecting` and `disconnected` signals.
- **User-facing behavior:** A status chip inside the question queue panel toggles between “Live”, “Reconnecting…”, and “Disconnected”. If retry is still in backoff, we keep retrying automatically; if it’s stuck, a “Reconnect” button becomes visible. The panel is wrapped in `ClientErrorBoundary` so unexpected exceptions surface a controlled fallback message instead of a crash.
- **Recovery:** Automatic retry uses exponential backoff. The “Reconnect” button lets users manually trigger a fresh subscription cycle. Once the channel reconnects, the chip returns to “Live.”
- **Telemetry:** `realtime/status` events tagged with `connected`, `reconnecting`, or `disconnected`, plus `realtime/reconnect` attempts.
- **Test coverage:** Integration test kills the realtime channel and confirms the UI shows reconnect state + button; error boundary test ensures UI fallback renders on unexpected exceptions.

### 4. Slow queries / cold starts

- **Trigger / detection:** Next.js route-level `loading.tsx` components and Suspense fallbacks detect that a route is still resolving data; we can flag durations exceeding 2–3 seconds.
- **User-facing behavior:** Each major panel renders skeleton placeholders immediately, then “Still working…” copy appears at ~2–3 seconds for especially long responses to reassure the user.
- **Recovery:** Once the data finishes loading, the skeletons disappear and the actual content renders; “Still working…” copy disappears automatically.
- **Telemetry:** Emit `performance/route-loading-delay` events containing the route and duration bucket (e.g., `<1s`, `1–3s`, `>3s`).
- **Test coverage:** Visual regression tests capture skeleton + “Still working…” states; automated smoke tests exercise routes with artificial delays.

### 5. Permission / role issues

- **Trigger / detection:** The backend already redirects unauthorized sessions to `/whoami`. Client-side routes double-check the user role before rendering.
- **User-facing behavior:** On `/whoami`, a concise explanation lists who the user is logged in as, their current role, what pages are accessible, and how to get access (demo user instructions, contact info). An optional reliability checklist (see below) can live on this screen so users know what’s covered.
- **Recovery:** Clear messaging around what’s allowed plus a call to action (e.g., “Request access” or “Use demo user”) gives the user next steps. Guarded routes render a fallback saying the user lacks permission instead of silently failing.
- **Telemetry:** `auth/access-denied` events include the route attempted and current role.
- **Test coverage:** Smoke test hitting a restricted route verifies the `/whoami` content and fallback messaging; role tests ensure the appropriate routes remain blocked.

## Reliability checklist (single-screen reference)

- Offline banner tested via the offline/online events and ensures retryable buttons re-enable.
- Auth expiry automatically triggers the toast + “Go to login” button and redirects to `/login` via existing server logic.
- Real-time disconnect surface shows the status chip, retries with backoff, and shows the manual “Reconnect” button when needed.
- Every major route provides a `loading.tsx`, `error.tsx`, and empty state so Suspense + ErrorBoundary flows stay consistent.
- `/whoami` clearly communicates identity, role, access scope, and recovery (demo user instructions/contact) for permission issues.
