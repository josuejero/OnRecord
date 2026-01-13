import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function ensureDemoSession(roomId) {
  const now = new Date().toISOString();
  const { data: existing, error: existingErr } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;

  if (existing) {
    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ status: 'scheduled', starts_at: now, ends_at: null })
      .eq('id', existing.id);
    if (updateErr) throw updateErr;
    return existing;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('sessions')
    .insert({ room_id: roomId, status: 'scheduled', starts_at: now, ends_at: null })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return inserted;
}

function locateOffset(text, snippet, labelName) {
  const start = text.indexOf(snippet);
  if (start === -1) {
    throw new Error(`Unable to find snippet "${snippet}" for ${labelName}`);
  }
  return [start, start + snippet.length];
}

async function main() {
  const { data: pf, error: pfErr } = await supabase
    .from('public_figures')
    .upsert({ slug: 'demo-mayor', name: 'Demo Mayor' }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (pfErr) throw pfErr;

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .upsert(
      { public_figure_id: pf.id, slug: 'press-room', title: 'Press Room' },
      { onConflict: 'public_figure_id,slug' }
    )
    .select('id')
    .single();
  if (roomErr) throw roomErr;

  const session = await ensureDemoSession(room.id);

  const transcriptText = [
    'Caregiver: Good morning, the medication patch remains in place and there is no new swelling.',
    'Caregiver: We gave ibuprofen earlier and she acknowledged the relief.',
    'Caregiver: The patient rated lumbar soreness at 3/10 when we asked if the new cushion helped while seated.',
    'Caregiver: Wound dressing looks dry; the wound specialist appointment is Thursday at 10, and we are booking the accessible shuttle.',
    'Caregiver: Mood stayed calm after our breathing exercise; the handoff notes will mention the safe transfer plan.'
  ].join(' ');

  const processedAt = new Date().toISOString();
  const transcriptPayload = {
    session_id: session.id,
    source: 'manual',
    raw_text: transcriptText,
    cleaned_text: transcriptText,
    meta: { demo: true, persona: 'caregiver', tone: 'calm' },
    processed_at: processedAt
  };

  const { error: transcriptErr } = await supabase.from('session_transcripts').upsert(transcriptPayload, {
    onConflict: 'session_id'
  });
  if (transcriptErr) throw transcriptErr;

  const labelDefinitions = [
    {
      id: '00000000-0000-0000-0000-0000000000a1',
      type: 'medication',
      snippet: 'We gave ibuprofen earlier and she acknowledged the relief.',
      value: 'ibuprofen dose acknowledged'
    },
    {
      id: '00000000-0000-0000-0000-0000000000a2',
      type: 'symptom',
      snippet: 'lumbar soreness at 3/10 when we asked if the new cushion helped while seated.',
      value: 'lumbar soreness'
    },
    {
      id: '00000000-0000-0000-0000-0000000000a3',
      type: 'appointment',
      snippet: 'appointment is Thursday at 10, and we are booking the accessible shuttle.',
      value: 'wound specialist appointment'
    },
    {
      id: '00000000-0000-0000-0000-0000000000a4',
      type: 'caregiver_task',
      snippet: 'booking the accessible shuttle.',
      value: 'transport coordination'
    },
    {
      id: '00000000-0000-0000-0000-0000000000a5',
      type: 'mood_sentiment',
      snippet: 'Mood stayed calm after our breathing exercise;',
      value: 'calm and cooperative'
    }
  ].map((def) => {
    const [start, end] = locateOffset(transcriptText, def.snippet, def.type);
    return {
      id: def.id,
      session_id: session.id,
      transcript_id: session.id,
      start_offset: start,
      end_offset: end,
      label_type: def.type,
      label_value: def.value,
      created_by: null
    };
  });

  const { error: labelErr } = await supabase
    .from('transcript_span_labels')
    .upsert(labelDefinitions, { onConflict: 'id' });
  if (labelErr) throw labelErr;

  const createSpan = (snippet) => {
    const [start, end] = locateOffset(transcriptText, snippet, 'recap');
    return { start_offset: start, end_offset: end };
  };

  const lumbarSpan = createSpan(
    'lumbar soreness at 3/10 when we asked if the new cushion helped while seated.'
  );
  const appointmentSpan = createSpan(
    'appointment is Thursday at 10, and we are booking the accessible shuttle.'
  );
  const shuttleSpan = createSpan('booking the accessible shuttle.');

  const keyConcerns = [
    {
      title: 'Pain is present but steady',
      detail: 'Lumbar soreness remains a 3/10, but ibuprofen is helping keep her comfortable.',
      evidence_span: lumbarSpan,
      label: {
        ...lumbarSpan,
        label_type: 'symptom',
        label_value: 'lumbar soreness'
      }
    },
    {
      title: 'Coordinating visits',
      detail: 'Thursday at 10 is confirmed for the wound specialist, and the accessible shuttle is being booked.',
      evidence_span: appointmentSpan,
      label: {
        ...shuttleSpan,
        label_type: 'caregiver_task',
        label_value: 'transport coordination'
      }
    }
  ];

  const followUpQuestions = [
    'Confirm the transportation provider and send the final itinerary to the care team.',
    'Verify that the wound check notes are uploaded to the shared record.'
  ];

  const recap = {
    summary: 'Caregiver notes highlight steady comfort management and the upcoming wound specialist visit.',
    key_concerns: keyConcerns,
    follow_up_questions: followUpQuestions,
    safety_notes: 'Draft recap only. Confirm the transcript before sharing and treat it as informational (not medical advice).',
    verification_notes: 'Verify statements and concerns with the official transcript prior to publishing.',
    model_info: {
      provider: 'mock',
      model_id: 'mock-recap-v1',
      prompt_version: 'demo-v1',
      executed_at: processedAt,
      hardware: 'seed-script'
    },
    labels: labelDefinitions.map((label) => ({
      start_offset: label.start_offset,
      end_offset: label.end_offset,
      label_type: label.label_type,
      label_value: label.label_value
    }))
  };

  const { error: recapErr } = await supabase.from('transcript_ai_outputs').upsert(
    {
      session_id: session.id,
      transcript_id: session.id,
      prompt_version: 'demo-v1',
      provider: 'mock',
      model_id: 'mock-recap-v1',
      output: recap,
      include_in_export: true,
      created_by: null
    },
    { onConflict: 'session_id,transcript_id,prompt_version,model_id' }
  );
  if (recapErr) throw recapErr;

  console.log('Seeded demo content:', {
    public_figure: pf.id,
    room: room.id,
    session: session.id,
    labels: labelDefinitions.map((label) => label.id)
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
