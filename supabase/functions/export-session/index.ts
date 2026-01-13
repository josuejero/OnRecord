import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ExportFormat = 'json' | 'csv' | 'jsonl';
type ExportInclude = 'transcript' | 'insights' | 'labels' | 'ai_outputs';

type RecapPayload = {
  recap: {
    slug: string;
    title: string;
    summary: string | null;
    published_at: string;
    session_id: string;
    session_status: string;
    starts_at: string;
    ends_at: string | null;
    public_figure_slug: string;
    public_figure_name: string;
    room_slug: string;
    room_title: string;
  };
  items: Array<{
    question_body: string;
    answer_body: string;
    asked_at: string;
    answered_at: string;
    sort_rank: number;
  }>;
  assets: Array<{
    id: string;
    public_url: string;
    mime_type: string;
    byte_size: number;
    sha256: string;
    original_filename: string | null;
    created_at: string;
  }>;
};

type TranscriptRow = {
  session_id: string;
  source: string;
  raw_text: string;
  cleaned_text: string | null;
  meta: Record<string, unknown> | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type InsightsRow = {
  session_id: string;
  computed_at: string;
  questions_total: number | null;
  questions_approved: number | null;
  questions_answered: number | null;
  questions_rejected: number | null;
  rejection_rate: number | null;
  avg_time_to_answer_seconds: number | null;
  top_terms: Array<{ term: string; count: number }> | null;
  transcript_word_count: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type LabelRow = {
  id: string;
  session_id: string;
  transcript_id: string;
  start_offset: number;
  end_offset: number;
  label_type: string;
  label_value: string | null;
  created_by: string | null;
  created_at: string;
};

type AiOutputRow = {
  id: string;
  session_id: string;
  transcript_id: string;
  prompt_version: string;
  provider: string;
  model_id: string;
  output: Record<string, unknown>;
  include_in_export: boolean;
  created_by: string | null;
  created_at: string;
};

type ExportPayload = RecapPayload & {
  transcript?: TranscriptRow | null;
  insights?: InsightsRow | null;
  labels?: LabelRow[];
  ai_outputs?: AiOutputRow[];
};

const VALID_INCLUDES: ReadonlySet<ExportInclude> = new Set([
  'transcript',
  'insights',
  'labels',
  'ai_outputs',
]);

function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  const hasComma = s.includes(',');
  const hasQuote = s.includes('"');
  const hasLf = s.includes(String.fromCharCode(10));
  const hasCr = s.includes(String.fromCharCode(13));

  if (hasComma || hasQuote || hasLf || hasCr) {
    return '"' + s.replaceAll('"', '""') + '"';
  }
  return s;
}

function toCsv(payload: RecapPayload): string {
  const header = [
    'recap_slug',
    'recap_title',
    'published_at',
    'public_figure',
    'room',
    'session_id',
    'asked_at',
    'answered_at',
    'sort_rank',
    'question',
    'answer',
  ];

  const rows = payload.items.map((it) => [
    payload.recap.slug,
    payload.recap.title,
    payload.recap.published_at,
    payload.recap.public_figure_name,
    payload.recap.room_title,
    payload.recap.session_id,
    it.asked_at,
    it.answered_at,
    it.sort_rank,
    it.question_body,
    it.answer_body,
  ]);

  const lines = [header.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return lines.join(String.fromCharCode(10));
}

function normalizeIncludeValue(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeIncludeValue(item));
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseIncludes(values: unknown[]): Set<ExportInclude> {
  const includes = new Set<ExportInclude>();
  for (const value of values) {
    for (const entry of normalizeIncludeValue(value)) {
      if (VALID_INCLUDES.has(entry as ExportInclude)) {
        includes.add(entry as ExportInclude);
      }
    }
  }
  return includes;
}

function resolveFormat(value: unknown): ExportFormat {
  if (value === 'csv') return 'csv';
  if (value === 'jsonl') return 'jsonl';
  return 'json';
}

function buildJsonResponse(payload: ExportPayload, filenameBase: string) {
  const body = JSON.stringify(payload, null, 2);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filenameBase}.json"`,
    },
  });
}

function buildJsonlResponse(lines: string[], filenameBase: string) {
  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'content-disposition': `attachment; filename="${filenameBase}.jsonl"`,
    },
  });
}

function buildCsvResponse(payload: RecapPayload, filenameBase: string) {
  const body = toCsv(payload);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filenameBase}.csv"`,
    },
  });
}

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response('Missing SUPABASE_URL or SUPABASE_ANON_KEY', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const url = new URL(req.url);

    const body =
      req.method === 'POST' ? await req.json().catch(() => ({}) as Record<string, unknown>) : {};
    const rawSlug = typeof body.slug === 'string' ? body.slug : url.searchParams.get('slug');
    const slug = rawSlug?.trim();

    if (!slug) return new Response('Missing slug', { status: 400 });

    const formatValue =
      typeof body.format === 'string' ? body.format : url.searchParams.get('format');
    const format = resolveFormat(formatValue);

    const includeParams = [body.include, ...url.searchParams.getAll('include')];
    const includes = parseIncludes(includeParams);

    if (format === 'jsonl' && !includes.has('labels') && !includes.has('ai_outputs')) {
      return new Response('jsonl export requires include=labels or include=ai_outputs', {
        status: 400,
      });
    }

    const { data, error } = await supabase.rpc('get_public_recap', { p_slug: slug });
    if (error) return new Response('RPC error: ' + error.message, { status: 500 });
    if (!data) return new Response('Not found', { status: 404 });

    const basePayload = data as RecapPayload;
    const payload: ExportPayload = { ...basePayload };
    const sessionId = basePayload.recap.session_id;

    if (includes.has('transcript')) {
      const { data: transcript, error: transcriptErr } = await supabase
        .from('session_transcripts')
        .select(
          'session_id, source, raw_text, cleaned_text, meta, processed_at, created_at, updated_at, created_by',
        )
        .eq('session_id', sessionId)
        .maybeSingle();
      if (transcriptErr)
        return new Response('Transcript fetch failed: ' + transcriptErr.message, { status: 500 });
      payload.transcript = transcript ?? null;
    }

    if (includes.has('insights')) {
      const { data: insights, error: insightErr } = await supabase
        .from('session_insights')
        .select(
          'session_id, computed_at, questions_total, questions_approved, questions_answered, questions_rejected, rejection_rate, avg_time_to_answer_seconds, top_terms, transcript_word_count, meta, created_at, updated_at',
        )
        .eq('session_id', sessionId)
        .maybeSingle();
      if (insightErr)
        return new Response('Insights fetch failed: ' + insightErr.message, { status: 500 });
      payload.insights = insights ?? null;
    }

    if (includes.has('labels')) {
      const { data: labels, error: labelsErr } = await supabase
        .from('transcript_span_labels')
        .select(
          'id, session_id, transcript_id, start_offset, end_offset, label_type, label_value, created_by, created_at',
        )
        .eq('session_id', sessionId)
        .order('start_offset', { ascending: true })
        .order('created_at', { ascending: true });
      if (labelsErr)
        return new Response('Labels fetch failed: ' + labelsErr.message, { status: 500 });
      payload.labels = labels ?? [];
    }

    {
      const requestedAiOutputs = includes.has('ai_outputs');

      let aiOutputsQuery = supabase
        .from('transcript_ai_outputs')
        .select(
          'id, session_id, transcript_id, prompt_version, provider, model_id, output, include_in_export, created_by, created_at',
        )
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!requestedAiOutputs) {
        aiOutputsQuery = aiOutputsQuery.eq('include_in_export', true);
      }

      const { data: outputs, error: outputsErr } = await aiOutputsQuery;
      if (outputsErr)
        return new Response('AI outputs fetch failed: ' + outputsErr.message, { status: 500 });

      if (requestedAiOutputs) {
        payload.ai_outputs = outputs ?? [];
      } else if (outputs && outputs.length) {
        payload.ai_outputs = outputs;
      }
    }

    const filenameBase = 'onrecord-' + basePayload.recap.slug;

    if (format === 'csv') {
      return buildCsvResponse(basePayload, filenameBase);
    }

    if (format === 'jsonl') {
      const lines: string[] = [];
      if (includes.has('labels')) {
        for (const label of payload.labels ?? []) {
          lines.push(JSON.stringify({ dataset: 'labels', ...label }));
        }
      }
      if (includes.has('ai_outputs')) {
        for (const output of payload.ai_outputs ?? []) {
          lines.push(JSON.stringify({ dataset: 'ai_outputs', ...output }));
        }
      }
      return buildJsonlResponse(lines, filenameBase);
    }

    return buildJsonResponse(payload, filenameBase);
  } catch (e: any) {
    return new Response('Unhandled error: ' + (e?.message ?? String(e)), { status: 500 });
  }
});
