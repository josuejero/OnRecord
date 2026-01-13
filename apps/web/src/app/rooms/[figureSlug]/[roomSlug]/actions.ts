'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { pipeline } from '@xenova/transformers';
import type { SummarizationPipeline } from '@xenova/transformers';
import { requireRole } from '@/lib/auth/require';
import { getEnv } from '@/lib/env';
import { getFeatureFlags } from '@/lib/config/features';
import { supabaseServer } from '@/lib/supabase/server';
import { AiRecapProvider, AiRecapProviderSchema, Recap, RecapSchema } from '@onrecord/shared';

function requireString(fd: FormData, key: string) {
  const v = fd.get(key);
  if (typeof v !== 'string' || v.trim().length === 0) throw new Error(`missing_${key}`);
  return v;
}

function getTrimmedField(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function assertAllowedUpload(mimeType: string, byteSize: number) {
  const MAX = 25 * 1024 * 1024;
  if (byteSize > MAX) throw new Error('File too large (max 25MB)');

  const ok =
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'application/octet-stream';

  if (!ok) throw new Error(`Unsupported MIME type: ${mimeType}`);
}

function assertAudioMimeType(mimeType: string) {
  if (!mimeType.startsWith('audio/')) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}

function parseJsonField(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`invalid_json_${key}`);
  }
}

function parseNumberField(formData: FormData, key: string, fallback = 0) {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`invalid_${key}`);
  }

  return parsed;
}

const SOURCE_WHITELIST = new Set(['manual', 'upload', 'import', 'voice']);

export async function createScheduledSession(formData: FormData) {
  const roomId = requireString(formData, 'room_id');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();

  const { error } = await supabase
    .from('sessions')
    .insert({ room_id: roomId, status: 'scheduled' });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function startSession(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase.rpc('start_session', { p_session_id: sessionId });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function endSession(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase.rpc('end_session', { p_session_id: sessionId });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function publishRecap(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const figureSlug = requireString(formData, 'figure_slug');
  const roomSlug = requireString(formData, 'room_slug');
  const publicFigureName = requireString(formData, 'public_figure_name');
  const roomTitle = requireString(formData, 'room_title');
  const revalidate = requireString(formData, 'revalidate');
  const summaryInput = getTrimmedField(formData, 'summary');
  const summary = summaryInput.length ? summaryInput : null;

  const short = sessionId.slice(0, 8);
  const slug = `${figureSlug}-${roomSlug}-${short}`;
  const title = `${publicFigureName} • ${roomTitle} • Recap`;

  const supabase = supabaseServer();
  const { error } = await supabase.rpc('publish_recap', {
    p_session_id: sessionId,
    p_slug: slug,
    p_title: title,
    p_summary: summary,
  });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
  revalidatePath(`/recaps/${slug}`);
}

export async function unpublishRecap(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const slug = requireString(formData, 'slug');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase.rpc('unpublish_recap', { p_session_id: sessionId });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
  revalidatePath(`/recaps/${slug}`);
}

export async function uploadAsset(formData: FormData) {
  const { user } = await requireRole(['moderator', 'staff', 'admin_service']);

  const sessionId = requireString(formData, 'session_id');
  const visibility = requireString(formData, 'visibility');
  const revalidate = requireString(formData, 'revalidate_path');

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Missing file');

  const mimeType = file.type || 'application/octet-stream';
  const originalFilename = file.name || null;

  const bytes = Buffer.from(await file.arrayBuffer());
  assertAllowedUpload(mimeType, bytes.length);

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

  const ext = originalFilename?.includes('.') ? originalFilename.split('.').pop() : null;
  const safeExt = ext && /^[a-zA-Z0-9]{1,8}$/.test(ext) ? `.${ext}` : '';

  const isPublic = visibility === 'public';
  const bucket = isPublic ? 'public-recap-assets' : 'private-session-assets';
  const objectPath = `sessions/${sessionId}/${sha256}${safeExt}`;

  const supabase = supabaseServer();

  const upRes = await supabase.storage.from(bucket).upload(objectPath, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (upRes.error) throw new Error(`Upload failed: ${upRes.error.message}`);

  const env = getEnv();
  const publicUrl = isPublic
    ? `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`
    : null;

  const ins = await supabase.from('assets').insert({
    session_id: sessionId,
    visibility: isPublic ? 'public' : 'private',
    bucket_id: bucket,
    object_path: objectPath,
    public_url: publicUrl,
    mime_type: mimeType,
    byte_size: bytes.length,
    sha256,
    original_filename: originalFilename,
    created_by: user.id,
  });

  if (ins.error) {
    await supabase.storage.from(bucket).remove([objectPath]);
    throw new Error(`DB insert failed: ${ins.error.message}`);
  }

  revalidatePath(revalidate);
}

export async function saveTranscript(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const rawText = requireString(formData, 'raw_text');
  const revalidate = requireString(formData, 'revalidate');

  await requireRole(['moderator', 'staff', 'admin_service']);

  const supabase = supabaseServer();
  const incomingSource = getTrimmedField(formData, 'source');
  const source = SOURCE_WHITELIST.has(incomingSource) ? incomingSource : 'manual';
  const meta = parseJsonField(formData, 'meta');

  const { error } = await supabase.from('session_transcripts').upsert(
    {
      session_id: sessionId,
      source,
      raw_text: rawText,
      meta,
    },
    { onConflict: 'session_id' },
  );

  if (error) throw new Error(error.message);

  const { error: rpcErr } = await supabase.rpc('refresh_session_insights', {
    p_session_id: sessionId,
  });
  if (rpcErr) throw new Error(rpcErr.message);

  revalidatePath(revalidate);
}

export async function processTranscript(formData: FormData) {
  const sessionId = requireString(formData, 'session_id');
  const revalidate = requireString(formData, 'revalidate');

  await requireRole(['moderator', 'staff', 'admin_service']);

  const supabase = supabaseServer();
  const { error } = await supabase.functions.invoke('process-transcript', {
    body: { session_id: sessionId },
  });

  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function generateRecap(formData: FormData) {
  const { user } = await requireRole(['staff', 'admin_service']);
  const sessionId = requireString(formData, 'session_id');
  const revalidate = requireString(formData, 'revalidate');

  const providerCandidate = getTrimmedField(formData, 'provider');
  const defaultProvider = getFeatureFlags().aiRecapProvider;
  const providerInput = providerCandidate || defaultProvider;
  const providerParse = AiRecapProviderSchema.safeParse(providerInput);

  if (!providerParse.success) {
    throw new Error('invalid_provider');
  }

  const provider = providerParse.data;
  const versionInput = getTrimmedField(formData, 'prompt_version');
  const promptVersion = versionInput || 'recap-v1';
  const includeInExport = formData.get('include_in_export') === 'true';

  const supabase = supabaseServer();
  const { data: transcriptRow, error: transcriptError } = await supabase
    .from('session_transcripts')
    .select('session_id, raw_text, cleaned_text')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (transcriptError || !transcriptRow) {
    throw new Error(transcriptError?.message ?? 'transcript_missing');
  }

  const transcriptText = (transcriptRow.cleaned_text ?? transcriptRow.raw_text ?? '').trim();
  const modelId = getDefaultModelId(provider);
  const recapCore = await buildRecapByProvider(provider, transcriptText);
  const hardwareHint = provider === 'browser' ? (supportsWebGPU() ? 'webgpu' : 'cpu') : 'cpu';

  const recapRecord = RecapSchema.parse({
    ...recapCore,
    model_info: {
      provider,
      model_id: modelId,
      prompt_version: promptVersion,
      executed_at: new Date().toISOString(),
      hardware: hardwareHint,
    },
  });

  await persistRecap({
    supabase,
    sessionId,
    transcriptId: transcriptRow.session_id,
    promptVersion,
    provider,
    modelId,
    recap: recapRecord,
    includeInExport,
    createdBy: user.id,
  });

  revalidatePath(revalidate);
}

export async function setRecapExportAttachment(formData: FormData) {
  await requireRole(['staff', 'admin_service']);
  const recapId = requireString(formData, 'recap_id');
  const attach = formData.get('attach') === 'true';
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('transcript_ai_outputs')
    .update({ include_in_export: attach })
    .eq('id', recapId);
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

type RecapCore = Omit<Recap, 'model_info'>;

type PersistRecapArgs = {
  supabase: ReturnType<typeof supabaseServer>;
  sessionId: string;
  transcriptId: string;
  promptVersion: string;
  provider: AiRecapProvider;
  modelId: string;
  recap: Recap;
  includeInExport: boolean;
  createdBy: string;
};

async function persistRecap(args: PersistRecapArgs) {
  const { error } = await args.supabase.from('transcript_ai_outputs').upsert(
    {
      session_id: args.sessionId,
      transcript_id: args.transcriptId,
      prompt_version: args.promptVersion,
      provider: args.provider,
      model_id: args.modelId,
      output: args.recap,
      include_in_export: args.includeInExport,
      created_by: args.createdBy,
    },
    { onConflict: 'session_id,transcript_id,prompt_version,model_id' },
  );

  if (error) throw new Error(error.message);
}

async function buildRecapByProvider(
  provider: AiRecapProvider,
  transcript: string,
): Promise<RecapCore> {
  const sourceText = transcript.length ? transcript : 'No transcript text available yet.';
  switch (provider) {
    case 'browser':
      return buildBrowserRecap(sourceText);
    case 'ollama':
      return buildOllamaRecap(sourceText);
    default:
      return buildMockRecap(sourceText);
  }
}

function getDefaultModelId(provider: AiRecapProvider): string {
  switch (provider) {
    case 'browser':
      return 'Xenova/distilbart-cnn-6-6';
    case 'ollama':
      return process.env.OLLAMA_MODEL?.trim() || 'ollama';
    default:
      return 'mock-recap-v1';
  }
}

function supportsWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined';
}

function buildMockRecap(transcript: string): RecapCore {
  const snippet = transcript.slice(0, 200).trim() || 'No transcript text yet.';
  return buildRecapFromSummary(snippet, transcript);
}

let summarizationPipeline: Promise<SummarizationPipeline> | null = null;

async function buildBrowserRecap(transcript: string): Promise<RecapCore> {
  try {
    if (!summarizationPipeline) {
      summarizationPipeline = pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
    }
    const summarizer = await summarizationPipeline;
    const truncated = transcript.length
      ? transcript.slice(0, 4000)
      : 'No transcript text available yet.';
    const [result] = (await summarizer(truncated, { max_new_tokens: 160 })) as Array<{
      summary_text?: string;
    }>;
    const summary = (result?.summary_text ?? '').trim();
    if (!summary) {
      throw new Error('empty_summary');
    }
    return buildRecapFromSummary(summary, transcript);
  } catch (error) {
    console.error('Browser recap generation failed; falling back to mock', error);
    return buildMockRecap(transcript);
  }
}

async function buildOllamaRecap(transcript: string): Promise<RecapCore> {
  try {
    const url = process.env.OLLAMA_API_URL?.trim() || 'http://127.0.0.1:11434/api/v1/predict';
    const model = process.env.OLLAMA_MODEL?.trim() || 'llama3';
    const temperature = Number(process.env.OLLAMA_TEMPERATURE ?? 0.25);
    const truncated = transcript.length
      ? transcript.slice(0, 3000)
      : 'No transcript text available yet.';
    const prompt = `Produce a short recap (3 concise sentences) highlighting the main takeaways and two key concerns from this transcript. Mention that the recap is a draft and do not provide medical advice.\n\nTranscript:\n${truncated}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature,
        max_output_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`ollama_error_${response.status}`);
    }

    const payload = await response.json();
    const summary = extractOllamaResponse(payload);
    if (!summary) {
      throw new Error('ollama_empty_response');
    }

    return buildRecapFromSummary(summary.trim(), transcript);
  } catch (error) {
    console.error('Ollama recap generation failed; falling back to mock', error);
    return buildMockRecap(transcript);
  }
}

function buildRecapFromSummary(summary: string, transcript: string): RecapCore {
  const safeSummary = summary.trim() || 'AI recap could not generate a summary yet.';
  const sentences = splitIntoSentences(safeSummary);
  const concerns = sentences.slice(0, 2).map((sentence, index) => ({
    title: index === 0 ? 'Key takeaway' : 'Conversation detail',
    detail: sentence,
    evidence_span: transcript.length ? buildEvidenceSpan(transcript, index * 20, 80) : undefined,
    label: index === 1 && transcript.length ? buildLabelSpan(transcript) : undefined,
  }));

  while (concerns.length < 2) {
    concerns.push({
      title: 'Draft note',
      detail: 'Review this draft for accuracy.',
      evidence_span: transcript.length ? buildEvidenceSpan(transcript, 0, 40) : undefined,
      label: undefined,
    });
  }

  const followUps = extractFollowUpQuestions(transcript);
  const followUpQuestions = followUps.length
    ? followUps
    : ['Verify the transcript for any additional follow-up questions.'];

  return {
    summary: safeSummary,
    key_concerns: concerns,
    follow_up_questions: followUpQuestions,
    safety_notes:
      'Draft recap only. Confirm the transcript before sharing and treat it as informational (not medical advice).',
    verification_notes:
      'Verify statements and concerns with the official transcript prior to publishing.',
  };
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((segment) => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractFollowUpQuestions(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/[^.?!]*\?/g);
  if (!matches) return [];
  return matches
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildEvidenceSpan(transcript: string, start: number, length: number) {
  if (!transcript.length) return undefined;
  const safeStart = Math.max(0, Math.min(start, transcript.length));
  let endOffset = Math.min(transcript.length, safeStart + length);
  if (endOffset <= safeStart) {
    endOffset = Math.min(transcript.length, safeStart + 1);
  }
  if (endOffset <= safeStart) {
    return undefined;
  }
  return {
    start_offset: safeStart,
    end_offset: endOffset,
  };
}

function buildLabelSpan(transcript: string) {
  const span = buildEvidenceSpan(transcript, 0, Math.min(40, transcript.length));
  if (!span) return undefined;
  return {
    ...span,
    label_type: 'review',
    label_value: 'needs_verification',
  };
}

function extractOllamaResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;

  const directResponse = record.response;
  if (typeof directResponse === 'string') return directResponse;
  if (Array.isArray(directResponse)) {
    for (const entry of directResponse) {
      const text = extractTextFromEntry(entry);
      if (text) return text;
    }
  }

  const output = record.output;
  if (Array.isArray(output)) {
    for (const entry of output) {
      const text = extractTextFromEntry(entry);
      if (text) return text;
    }
  }

  const choices = record.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== 'object') continue;
      const message = (choice as Record<string, unknown>).message as
        | Record<string, unknown>
        | undefined;
      if (!message) continue;
      const text = extractTextFromEntry(message.content);
      if (text) return text;
    }
  }

  return null;
}

function extractTextFromEntry(entry: unknown): string | null {
  if (entry == null) return null;
  if (typeof entry === 'string') return entry;
  if (typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  const directText = record.text;
  if (typeof directText === 'string') return directText;
  const content = record.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    for (const chunk of content) {
      const nested = extractTextFromEntry(chunk);
      if (nested) return nested;
    }
  }
  return null;
}

export async function uploadSessionAudio(formData: FormData) {
  const featureFlags = getFeatureFlags();
  if (!featureFlags.voiceUploadEnabled) {
    throw new Error('voice_upload_disabled');
  }

  const { user } = await requireRole(['moderator', 'staff', 'admin_service']);
  const sessionId = requireString(formData, 'session_id');
  const revalidate = requireString(formData, 'revalidate');
  const durationMs = parseNumberField(formData, 'duration_ms', 0);

  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('missing_file');
  }

  const mimeType = file.type || 'application/octet-stream';
  assertAudioMimeType(mimeType);
  const originalFilename = file.name || null;

  const supabase = supabaseServer();

  const { data: sessionRow, error: sessionErr } = await supabase
    .from('sessions')
    .select('room_id')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    throw new Error('invalid_session');
  }

  const { data: roomRow, error: roomErr } = await supabase
    .from('rooms')
    .select('slug')
    .eq('id', sessionRow.room_id)
    .single();

  if (roomErr || !roomRow) {
    throw new Error('invalid_room');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const ext = originalFilename?.includes('.') ? originalFilename.split('.').pop() : null;
  const safeExt = ext && /^[a-zA-Z0-9]{1,8}$/.test(ext) ? `.${ext}` : '';
  const objectPath = `rooms/${roomRow.slug}/sessions/${sessionId}/audio/${sha256}${safeExt}`;

  const uploadRes = await supabase.storage.from('session-audio').upload(objectPath, bytes, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadRes.error) throw new Error(`Upload failed: ${uploadRes.error.message}`);

  const insert = await supabase.from('session_audio_assets').insert({
    session_id: sessionId,
    storage_path: objectPath,
    mime_type: mimeType,
    duration_ms: Math.round(durationMs),
    transcript_id: sessionId,
    created_by: user.id,
  });

  if (insert.error) {
    await supabase.storage.from('session-audio').remove([objectPath]);
    throw new Error(`DB insert failed: ${insert.error.message}`);
  }

  revalidatePath(revalidate);
}
