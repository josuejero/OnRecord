# PR Checklist

## Delivery basics

- [ ] Updated docs if architecture or flows changed (see `docs/` for phase/contract sections).
- [ ] Confirmed no secrets are committed.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm e2e` pass locally.
- [ ] Supabase migrations still apply (`pnpm supabase:reset`) when database contracts change.

## UI polish

- [ ] Responsive UI verified at small viewport + hiDPI so the polished layout survives phones → dashboards.
- [ ] Keyboard navigation checked (dialogs trap focus, Tab/Shift+Tab ordering, actionable state reachable).
- [ ] Loading states do not shift layout (skeletons/ toasts keep CLS stable) according to `docs/ui-contract.md`.
- [ ] Empty, error, and success states were exercised/reviewed so the shared contract (loading + error boundaries) stays consistent.
