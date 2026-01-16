import { createClient } from '@supabase/supabase-js';

const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const DEMO_ROOM_SLUG = 'demo-room';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

async function findDemoSessionId(): Promise<string> {
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id')
    .eq('slug', DEMO_ROOM_SLUG)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!room) throw new Error(`Demo room (${DEMO_ROOM_SLUG}) not found`);

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) throw new Error('Demo session not found');
  return session.id;
}

async function removeRows(table: string, sessionId: string) {
  const { error } = await supabase.from(table).delete().eq('session_id', sessionId);
  if (error) throw error;
}

export async function resetDemoState() {
  const sessionId = await findDemoSessionId();
  await removeRows('answers', sessionId);
  await removeRows('questions', sessionId);
  await removeRows('recap_pages', sessionId);
  await removeRows('assets', sessionId);

  const { error: sessionError } = await supabase
    .from('sessions')
    .update({
      status: 'scheduled',
      starts_at: new Date().toISOString(),
      ends_at: null,
      active_question_id: null,
    })
    .eq('id', sessionId);
  if (sessionError) throw sessionError;
}

export async function ensureRecapUnpublished(slug: string) {
  const normalized = slug.trim();
  if (!normalized) return;

  const { error } = await supabase.from('recap_pages').delete().eq('slug', normalized);
  if (error) throw error;
}
