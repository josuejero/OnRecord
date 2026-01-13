/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type TopTerm = { term: string; count: number };

type Body = {
  session_id?: string;
  dry_run?: boolean;
  capture_metadata?: Record<string, unknown>;
  redaction_metadata?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildMetaPayload(existing: unknown, extras: Body): Record<string, unknown> | null {
  const base: Record<string, unknown> = isPlainObject(existing) ? { ...existing } : {};
  let hasUpdates = false;

  if (isPlainObject(extras.capture_metadata)) {
    base.capture_metadata = extras.capture_metadata;
    hasUpdates = true;
  }

  if (isPlainObject(extras.redaction_metadata)) {
    base.redaction_metadata = extras.redaction_metadata;
    hasUpdates = true;
  }

  return hasUpdates ? base : null;
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTimestamps(s: string): string {
  return s
    .replace(/\[\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\]/g, '')
    .replace(/\b\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\b/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '');
}

function cleanTranscript(raw: string): string {
  const noTs = stripTimestamps(raw);
  return normalizeWhitespace(noTs);
}

function extractTopTerms(text: string, limit = 12): TopTerm[] {
  const stop = new Set([
    'the',
    'and',
    'that',
    'this',
    'with',
    'from',
    'your',
    'have',
    'are',
    'for',
    'you',
    'was',
    'were',
    'not',
    'they',
    'their',
    'them',
    'what',
    'when',
    'where',
    'which',
    'will',
    'would',
    'could',
    'should',
    'into',
    'about',
    'there',
    'here',
    'been',
    'being',
    'also',
    'than',
    'then',
    'just',
    'like',
    'because',
    'while',
    'over',
    'under',
    'between',
    'within',
    'these',
    'those',
    'some',
    'more',
    'most',
    'very',
  ]);

  const counts = new Map<string, number>();
  for (const token of text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)) {
    if (!token) continue;
    if (token.length < 4) continue;
    if (stop.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: 'missing_env', details: 'SUPABASE_URL or SUPABASE_ANON_KEY' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const body = (await req.json().catch(() => ({}))) as Body;
  const session_id = body?.session_id;
  const dry_run = Boolean(body?.dry_run);

  if (!session_id) return json({ error: 'missing_session_id' }, 400);

  const { data: transcript, error: tErr } = await supabase
    .from('session_transcripts')
    .select('raw_text, meta')
    .eq('session_id', session_id)
    .maybeSingle();

  if (tErr) return json({ error: 'transcript_fetch_failed', details: tErr.message }, 400);
  if (!transcript) return json({ error: 'transcript_not_found' }, 404);

  const cleaned = cleanTranscript(transcript.raw_text);
  const topTerms = extractTopTerms(cleaned, 12);

  if (!dry_run) {
    const updatePayload: Record<string, unknown> = {
      cleaned_text: cleaned,
      processed_at: new Date().toISOString(),
    };

    const metaPayload = buildMetaPayload(transcript.meta, body);
    if (metaPayload) {
      updatePayload.meta = metaPayload;
    }

    const { error: upErr } = await supabase
      .from('session_transcripts')
      .update(updatePayload)
      .eq('session_id', session_id);

    if (upErr) return json({ error: 'transcript_update_failed', details: upErr.message }, 400);

    const { data: insights, error: rpcErr } = await supabase.rpc('refresh_session_insights', {
      p_session_id: session_id,
      p_top_terms: topTerms,
    });

    if (rpcErr) return json({ error: 'insights_refresh_failed', details: rpcErr.message }, 400);

    return json({
      ok: true,
      dry_run,
      cleaned_preview: cleaned.slice(0, 800),
      top_terms: topTerms,
      insights,
    });
  }

  return json({
    ok: true,
    dry_run,
    cleaned_preview: cleaned.slice(0, 800),
    top_terms: topTerms,
  });
});
