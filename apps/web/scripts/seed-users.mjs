import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function parseEnvLine(rawLine) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) return null;
  const separatorIndex = line.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = line.slice(0, separatorIndex).trim();
  let value = line.slice(separatorIndex + 1).trim();

  if (!key) return null;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFromString(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(rawLine);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  loadEnvFromString(fs.readFileSync(filePath, 'utf8'));
}

function tryLoadSupabaseCliEnv() {
  try {
    const output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    loadEnvFromString(output);
  } catch {
    // ignore; we only use CLI output when available
  }
}

[
  path.join(repoRoot, 'apps', 'web', '.env.local'),
  path.join(repoRoot, 'apps', 'web', '.env'),
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, '.env'),
].forEach(loadEnvFile);

let supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  tryLoadSupabaseCliEnv();
  supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    'Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY',
  );
}

const supabase = createClient(supabaseUrl, serviceKey);

const users = [
  {
    email: 'reporter@onrecord.local',
    password: 'password123!',
  },
  {
    email: 'moderator@onrecord.local',
    password: 'password123!',
  },
  {
    email: 'staff@onrecord.local',
    password: 'password123!',
  },
];

async function createUser({ email, password }) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user;
}

async function main() {
  const reporter = await createUser(users[0]);
  const moderator = await createUser(users[1]);
  const staff = await createUser(users[2]);

  await supabase.from('profiles').update({ role: 'moderator' }).eq('user_id', moderator.id);
  await supabase.from('profiles').update({ role: 'staff' }).eq('user_id', staff.id);

  await supabase
    .from('reporters')
    .update({ credential_status: 'approved' })
    .eq('user_id', reporter.id);

  console.log('Seeded users:');
  console.log({ reporter: reporter.email, moderator: moderator.email, staff: staff.email });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
