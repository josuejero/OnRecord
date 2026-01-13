# PR Checklist

- [ ] Updated docs if architecture or flows changed
- [ ] Confirmed no secrets are committed
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm e2e` pass locally
- [ ] Supabase migrations still apply (`pnpm supabase:reset`) if changed
