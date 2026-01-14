#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="$(mktemp)"
SUPABASE_LOG="$(mktemp)"

cleanup() {
  echo
  echo "Stopping Supabase..."
  pnpm exec supabase stop >/dev/null 2>&1 || true
  if [[ -n "${SUPABASE_PID:-}" ]] && ps -p "$SUPABASE_PID" >/dev/null 2>&1; then
    kill "$SUPABASE_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$ENV_FILE" "$SUPABASE_LOG"
}

trap cleanup EXIT

echo "Starting Supabase stack… (logs: $SUPABASE_LOG)"
pnpm supabase:start > "$SUPABASE_LOG" 2>&1 &
SUPABASE_PID=$!

echo "Warming Supabase services..."
sleep 6

echo "Capturing Supabase env values…"
pnpm exec supabase status -o env > "$ENV_FILE"
set -a
source "$ENV_FILE"

cat <<EOF > apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$SUPABASE_ANON_KEY}
EOF

echo "Resetting database and seeding demo users…"
pnpm supabase:reset
pnpm seed:users

cat <<'EOF'
Demo accounts (local):
  - Reporter: reporter@onrecord.local / password123!
  - Moderator: moderator@onrecord.local / password123!

URLs:
  - App: http://127.0.0.1:3000
  - Supabase Studio: http://127.0.0.1:54323

Next steps: use the credentials above in the browser that opens.
EOF

pnpm --filter @onrecord/web dev
