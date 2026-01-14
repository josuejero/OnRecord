import { execSync } from 'node:child_process';
import path from 'node:path';

function parseEnvExports(output: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Handles:
    // - export KEY="VALUE"
    // - export KEY=VALUE
    // - KEY=VALUE
    const exportPrefix = line.startsWith('export ') ? 'export ' : '';
    const assignment = line.slice(exportPrefix.length);

    const eqIdx = assignment.indexOf('=');
    if (eqIdx === -1) continue;

    const key = assignment.slice(0, eqIdx).trim();
    let value = assignment.slice(eqIdx + 1).trim();

    // Strip wrapping quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) env[key] = value;
  }

  return env;
}

export default async function globalSetup() {
  // If the user already exported these, leave them alone.
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  // apps/web/playwright -> repo root
  const repoRoot = path.resolve(__dirname, '../../..');

  let output = '';
  try {
    output = execSync('pnpm exec supabase status -o env', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
  } catch (err: any) {
    const stderr = String(err?.stderr ?? '');
    const message =
      stderr.trim() ||
      String(err?.message ?? 'Failed to run: pnpm exec supabase status -o env');

    throw new Error(
      [
        'Playwright could not load Supabase env vars automatically.',
        '',
        'Make sure local Supabase is running and healthy, then retry:',
        '  pnpm supabase:start',
        '  pnpm exec supabase status',
        '',
        'Raw error:',
        message,
      ].join('\n'),
    );
  }

  const parsed = parseEnvExports(output);

  // Only set what isn't already set in the current shell.
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) process.env[key] = value;
  }

  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((k) => !process.env[k]);

  if (missing.length) {
    throw new Error(
      [
        `Missing required env var(s): ${missing.join(', ')}`,
        '',
        'Try:',
        '  pnpm supabase:start',
        '  pnpm exec supabase status -o env',
        '',
        'Then re-run the Playwright command.',
      ].join('\n'),
    );
  }
}
