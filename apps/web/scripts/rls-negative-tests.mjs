import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_ANON_KEY = requireEnv('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const reporterEmail = 'reporter@onrecord.local';
const moderatorEmail = 'moderator@onrecord.local';
const password = 'password123!';

async function signIn(email) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function assertDenied(promise, label) {
  try {
    const res = await promise;
    if (res.error) {
      console.log(`✅ denied as expected: ${label}`);
      return;
    }
    throw new Error(`Expected denial but got success for ${label}`);
  } catch {
    console.log(`✅ denied as expected (throw): ${label}`);
  }
}

async function assertAllowed(promise, label) {
  const res = await promise;
  if (res.error) throw new Error(`Expected allowed but got error for ${label}: ${res.error.message}`);
  console.log(`✅ allowed as expected: ${label}`);
}

function assertNoError(error, label) {
  if (error) throw new Error(`Expected no error for ${label}: ${error.message}`);
}

async function main() {
  const reporter = await signIn(reporterEmail);
  const moderator = await signIn(moderatorEmail);

  await assertDenied(
    reporter.from('public_figures').insert({ slug: 'should-fail', name: 'Should Fail' }),
    'reporter insert public_figures'
  );

  await assertDenied(
    reporter.from('rooms').update({ title: 'nope' }).eq('slug', 'press-room'),
    'reporter update rooms'
  );

  await assertAllowed(
    moderator.from('reporters').select('user_id, credential_status').limit(1),
    'moderator select reporters'
  );

  const resourceId =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : '00000000-0000-0000-0000-000000000000';

  const { data: inserted, error: insErr } = await admin
    .from('audit_events')
    .insert({
      actor_user_id: null,
      action: 'test.audit.insert',
      entity_table: 'test_table',
      entity_id: resourceId,
      metadata: { hello: 'world' }
    })
    .select('id')
    .single();

  assertNoError(insErr, 'admin audit insert');
  if (!inserted?.id) throw new Error('Missing insert id');

  {
    const { error } = await reporter.from('audit_events').update({ action: 'hacked' }).eq('id', inserted.id);
    if (!error) throw new Error('Expected reporter update to be denied');
    console.log('✅ denied as expected: reporter update audit_events');
  }

  {
    const { error } = await moderator.from('audit_events').delete().eq('id', inserted.id);
    if (!error) throw new Error('Expected moderator delete to be denied');
    console.log('✅ denied as expected: moderator delete audit_events');
  }

  const { data: roomRow } = await admin.from('rooms').select('id').limit(1).single();
  if (!roomRow?.id) throw new Error('Missing room for RLS transcript checks');
  await admin.from('sessions').delete().eq('id', resourceId);
  const { error: sessionInsertErr } = await admin
    .from('sessions')
    .insert({
      id: resourceId,
      room_id: roomRow.id,
      status: 'scheduled'
    })
    .select('id');
  assertNoError(sessionInsertErr, 'admin insert session for transcripts');

  const cleanup = async () => {
    for (const { table, column } of [
      { table: 'session_insights', column: 'session_id' },
      { table: 'session_audio_assets', column: 'session_id' },
      { table: 'transcript_ai_outputs', column: 'session_id' },
      { table: 'transcript_span_labels', column: 'session_id' },
      { table: 'session_transcripts', column: 'session_id' },
      { table: 'sessions', column: 'id' }
    ]) {
      try {
        await admin.from(table).delete().eq(column, resourceId);
      } catch (err) {
        console.error(`Cleanup warning for ${table}:`, err);
      }
    }
  };

  try {
    await assertDenied(
      reporter.from('session_transcripts').insert({
        session_id: resourceId,
        raw_text: 'unauthorized attempt'
      }),
      'reporter insert session_transcripts'
    );

    const { error: transcriptSeedErr } = await admin.from('session_transcripts').insert({
      session_id: resourceId,
      source: 'manual',
      raw_text: 'base transcript',
      cleaned_text: 'base transcript cleaned'
    });
    assertNoError(transcriptSeedErr, 'admin insert session_transcripts base');

    await assertDenied(
      reporter.from('session_transcripts').select('session_id').limit(1),
      'reporter select session_transcripts'
    );

    await assertDenied(
      reporter.from('session_transcripts').update({ raw_text: 'tampered' }).eq('session_id', resourceId),
      'reporter update session_transcripts'
    );

    const { error: insightsSeedErr } = await admin.from('session_insights').insert({
      session_id: resourceId,
      transcript_word_count: 1,
      questions_total: 1,
      rejection_rate: 0
    });
    assertNoError(insightsSeedErr, 'admin insert session_insights base');

    await assertDenied(
      reporter.from('session_insights').select('session_id').limit(1),
      'reporter select session_insights'
    );

    await assertDenied(
      reporter.from('session_insights').insert({
        session_id: resourceId
      }),
      'reporter insert session_insights'
    );

    await assertDenied(
      reporter.from('session_insights').update({ questions_total: 2 }).eq('session_id', resourceId),
      'reporter update session_insights'
    );

    const { error: audioSeedErr } = await admin.from('session_audio_assets').insert({
      session_id: resourceId,
      storage_path: `rooms/${roomRow.id}/sessions/${resourceId}/audio/seed.mp3`,
      mime_type: 'audio/mpeg',
      duration_ms: 120000,
      transcript_id: resourceId
    });
    assertNoError(audioSeedErr, 'admin insert session_audio_assets base');

    await assertDenied(
      reporter.from('session_audio_assets').select('id').limit(1),
      'reporter select session_audio_assets'
    );

    await assertDenied(
      reporter.from('session_audio_assets').insert({
        session_id: resourceId,
        storage_path: `rooms/${roomRow.id}/sessions/${resourceId}/audio/block.mp3`,
        mime_type: 'audio/mpeg',
        duration_ms: 4000,
        transcript_id: resourceId
      }),
      'reporter insert session_audio_assets'
    );

    const { error: labelsSeedErr } = await admin.from('transcript_span_labels').insert({
      session_id: resourceId,
      transcript_id: resourceId,
      start_offset: 0,
      end_offset: 5,
      label_type: 'sensitivity',
      label_value: 'redacted'
    });
    assertNoError(labelsSeedErr, 'admin insert transcript_span_labels base');

    await assertDenied(
      reporter.from('transcript_span_labels').select('id').limit(1),
      'reporter select transcript_span_labels'
    );

    await assertDenied(
      reporter.from('transcript_span_labels').insert({
        session_id: resourceId,
        transcript_id: resourceId,
        start_offset: 1,
        end_offset: 2,
        label_type: 'testing'
      }),
      'reporter insert transcript_span_labels'
    );

    const { error: aiSeedErr } = await admin.from('transcript_ai_outputs').insert({
      session_id: resourceId,
      transcript_id: resourceId,
      prompt_version: 'v1',
      provider: 'test-y',
      model_id: 'test-model',
      output: { answer: 'test' }
    });
    assertNoError(aiSeedErr, 'admin insert transcript_ai_outputs base');

    await assertDenied(
      reporter.from('transcript_ai_outputs').select('id').limit(1),
      'reporter select transcript_ai_outputs'
    );

    await assertDenied(
      reporter.from('transcript_ai_outputs').insert({
        session_id: resourceId,
        transcript_id: resourceId,
        prompt_version: 'v1',
        provider: 'test-y',
        model_id: 'test-model',
        output: { answer: 'halt' }
      }),
      'reporter insert transcript_ai_outputs'
    );
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
