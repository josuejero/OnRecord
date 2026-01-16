import { chromium, type Browser, type FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { loginAs } from './helpers/auth';

function mustGetEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`[playwright global-setup] Missing env var: ${key}`);
  return v;
}

function getBaseURL(config: FullConfig) {
  const projectBaseURL = config.projects[0]?.use?.baseURL;
  if (typeof projectBaseURL === 'string') return projectBaseURL;
  const configBaseURL = (config as FullConfig & { use?: { baseURL?: string } }).use?.baseURL;
  if (typeof configBaseURL === 'string') return configBaseURL;
  return 'http://127.0.0.1:3000';
}

async function waitForServer(baseURL: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  const url = new URL('/login', baseURL).toString();
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // Ignore until the server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`[playwright global-setup] Server not ready at ${baseURL}`);
}

async function createStorageState(opts: {
  browser: Browser;
  baseURL: string;
  path: string;
  email: string;
}) {
  const context = await opts.browser.newContext({ baseURL: opts.baseURL });
  const page = await context.newPage();
  await loginAs(page, { email: opts.email });
  await context.storageState({ path: opts.path });
  await context.close();
}

export default async function globalSetup(_config: FullConfig) {
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

  const authDir = path.join(projectRoot, 'playwright/.auth');
  await fs.mkdir(authDir, { recursive: true });

  const baseURL = getBaseURL(_config);
  await waitForServer(baseURL);
  const browser = await chromium.launch();
  try {
    await createStorageState({
      browser,
      baseURL,
      path: path.join(authDir, 'reporter.json'),
      email: 'reporter@onrecord.local',
    });
    await createStorageState({
      browser,
      baseURL,
      path: path.join(authDir, 'moderator.json'),
      email: 'moderator@onrecord.local',
    });
    await createStorageState({
      browser,
      baseURL,
      path: path.join(authDir, 'staff.json'),
      email: 'staff@onrecord.local',
    });
  } finally {
    await browser.close();
  }
}
