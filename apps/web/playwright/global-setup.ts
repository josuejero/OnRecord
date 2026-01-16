import type { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';

function mustGetEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`[playwright global-setup] Missing env var: ${key}`);
  return v;
}

export default async function globalSetup(_config: FullConfig) {
  void _config;
  // Ensure the web server can start under Playwright with the exact env vars it expects.
  // (e2e config uses `pnpm --filter @onrecord/web dev ...`, so it reads apps/web/.env and process env)
  // Map common Supabase env var names to the ones the app expects.

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.API_URL;

  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.ANON_KEY;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SERVICE_ROLE_KEY;


  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      [
        '[playwright global-setup] Missing Supabase env vars for e2e.',
        'Need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY.',
      ].join('\n'),
    );
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

  // Run the dedicated e2e seeding script so we fail fast on missing state.
  const projectRoot = path.resolve(__dirname, '..');
  execSync('pnpm -s --filter @onrecord/web run db:seed:e2e', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  // Smoke check for required env after mapping
  mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
  mustGetEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');
}
