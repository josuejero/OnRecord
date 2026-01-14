# Start here

Most reviewers arrive seeking a quick sense of the UI polish, reliability, and how to run the demo. Use this path to keep that focus:

1. **README hero + demo sprint** (`README.md` top, “Demo sprint” section) — hero bullets, Quickstart, and “what to click” give recruiters an instant feel for the experience.
2. **Performance & accessibility proof** (`docs/accessibility.md`, Lighthouse screenshot, Axe/Playwright tests) — shows the accessibility commitments plus the Lighthouse CI budgets that guard perf/regressions.
3. **UI contracts & reliability** (`docs/ui-contract.md`, `docs/ui-reliability.md`, `docs/components.md`) — validated patterns for loading/empty/error/success states plus shared primitives.
4. **Cross-browser/testing matrix** (`docs/test-matrix.md`, `apps/web/playwright` specs) — details the devices/browsers covered, new accessibility smoke tests, and Lighthouse budgets.
5. **Run the demo** (`pnpm demo`, `docs/local-runbook.md`, `.env.example`) — one command to reset, seed, start Supabase + Next, plus reference env template so no secrets leak.

Need more context? See `docs/pr-checklist.md` for delivery cues and `docs/reviewers.md` for deeper reviewer scripts.
