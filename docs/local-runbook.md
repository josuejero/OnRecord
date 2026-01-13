# Local runbook

## 1. Start services

```bash
pnpm install
pnpm supabase:start
pnpm exec supabase status
```

## 2. Configure the web app env

Edit `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_LOCAL_ANON_KEY
```

Also provide the service role key if your server helpers require it:

```
SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY
```

## 3. Reset database and seed demo content

```bash
pnpm supabase:reset
```

## 4. Seed demo users

Export the service role key and run the seed script:

```bash
export SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY

pnpm --filter @onrecord/web exec node scripts/seed-users.mjs
```

If you have a separate demo data script, run it after seeding users:

```bash
pnpm --filter @onrecord/web exec node scripts/seed-demo-data.mjs
```

## 5. Run the app and tests

```bash
pnpm dev
pnpm --filter @onrecord/web test:e2e
```

## 6. Troubleshooting

### Rooms list is empty

- Confirm the reporter is approved if logged in as a reporter.
- Staff/moderator accounts must have `user_roles` rows.
- The `rooms` and `public_figures` read policies must exist.

### Start session fails with `live_session_already_exists_for_room`

- End the live session via the UI or run:

```sql
update public.sessions set status='ended', ends_at=now()
where room_id = 'ROOM_UUID' and status='live';
```

### Permission denied for table sessions

- Ensure `sessions_insert_staff` exists if creating sessions via insert.
- Alternatively, call an RPC instead of inserting directly once the policies tighten.

## 7. Verification checklist

- [ ] Approved reporter sees “Press Room: Demo” and can open the room.
- [ ] Moderator sees a scheduled session and a **Start session** button.
- [ ] Starting the session shifts it to `live`.
- [ ] Database enforces at most one live session per room.
- [ ] Reporter reloads the room detail page and still sees `live`.
- [ ] Playwright session workflow test passes.
- [ ] `audit_events` contains `session_started` and `session_ended` entries.

## 8. Phase 6 assets retention

### Public recap assets

- Retain while the associated recap is published.
- Remove within 30 days if the recap is unpublished or deleted.

### Private session assets

- Retain for 90 days after the session ends even if the recap stays published.

### Manual removal runbook (service role)

1. Identify the row in `public.assets` for the asset.
2. Delete the underlying storage object.
3. Delete the metadata row.

Example (local):

```bash
pnpm exec supabase storage rm public-recap-assets sessions/<session_id>/<sha>.pdf
```

Then, in SQL:

```sql
delete from public.assets where session_id = '<session_id>' and sha256 = '<sha256>';
```
