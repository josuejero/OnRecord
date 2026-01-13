import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
