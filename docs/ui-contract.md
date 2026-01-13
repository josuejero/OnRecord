# UI Contract

Every entry point must clearly tell the story of what the UI is doing. Follow these rules of behavior across routes, panels, and workflows:

1. **Loading** – Show an immediate loading UI via `loading.tsx` (or a Suspense fallback) whenever a route or major panel begins rendering. Use skeleton states for lists, tables, cards, or anything that could otherwise render a spinner-only page.
2. **Empty** – Empty states explain what is missing, include a helpful illustration or highlight, and offer a clear next action (“create one”, “import data”, etc.) so users are never staring at a blank screen.
3. **Error** – Surface errors in user-facing UI components (route-level `error.tsx` or `global-error.tsx` when needed). Recoverable errors should include remediation paths so the user can retry or navigate elsewhere instead of getting stuck.
4. **Success** – Every impactful action (save, publish, upload, submit, etc.) confirms completion via a toast, inline message, or transient checkmark so users know their intent was honored.

**Why this matters in the Next.js App Router**

- `loading.tsx` (plus Suspense fallbacks) deliver the instant feedback that streaming routes depend on.
- Error boundaries (`error.tsx`, optionally `global-error.tsx`) prevent crashes from leaving the user in limbo.
- `not-found.tsx` handles missing segments consistently instead of falling back to generic 404s.

Adhering to this contract keeps every page predictable, actionable, and resilient.
