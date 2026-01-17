'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';
import { LabelType, LABEL_TYPES } from './types';

function requireString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`missing_${key}`);
  }
  return value.trim();
}

function parseIntegerField(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error(`missing_${key}`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || Number.isNaN(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`invalid_${key}`);
  }
  return value;
}

function parseLabelType(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    throw new Error(`missing_${key}`);
  }
  const candidate = value.trim();
  if (!LABEL_TYPES.includes(candidate as LabelType)) {
    throw new Error('invalid_label_type');
  }
  return candidate as LabelType;
}

function parseOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function createLabel(formData: FormData) {
  const { user } = await requireRole(['moderator', 'staff', 'admin_service']);
  const sessionId = requireString(formData, 'session_id');
  const transcriptId = requireString(formData, 'transcript_id');
  const startOffset = parseIntegerField(formData, 'start_offset');
  const endOffset = parseIntegerField(formData, 'end_offset');
  const labelType = parseLabelType(formData, 'label_type');
  const labelValue = parseOptionalString(formData, 'label_value');
  const revalidate = requireString(formData, 'revalidate');

  if (endOffset <= startOffset) {
    throw new Error('invalid_selection');
  }

  const supabase = supabaseServer();
  const { data: transcriptRow, error: transcriptError } = await supabase
    .from('session_transcripts')
    .select('session_id, raw_text, cleaned_text')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (transcriptError) throw new Error(transcriptError.message);
  if (!transcriptRow) throw new Error('transcript_missing');

  const transcriptText = transcriptRow.cleaned_text ?? transcriptRow.raw_text ?? '';
  if (startOffset < 0 || endOffset > transcriptText.length) {
    throw new Error('selection_out_of_bounds');
  }

  const { data: overlapping, error: overlapError } = await supabase
    .from('transcript_span_labels')
    .select('id')
    .eq('session_id', sessionId)
    .eq('transcript_id', transcriptId)
    .lt('start_offset', endOffset)
    .gt('end_offset', startOffset)
    .limit(1);

  if (overlapError) throw new Error(overlapError.message);
  if (overlapping && overlapping.length) {
    throw new Error('selection_overlaps');
  }

  const { error: insertError } = await supabase.from('transcript_span_labels').insert({
    session_id: sessionId,
    transcript_id: transcriptId,
    start_offset: startOffset,
    end_offset: endOffset,
    label_type: labelType,
    label_value: labelValue,
    created_by: user.id,
  });

  if (insertError) throw new Error(insertError.message);

  revalidatePath(revalidate);
}

export async function updateLabel(formData: FormData) {
  await requireRole(['moderator', 'staff', 'admin_service']);
  const labelId = requireString(formData, 'label_id');
  const labelType = parseLabelType(formData, 'label_type');
  const labelValue = parseOptionalString(formData, 'label_value');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('transcript_span_labels')
    .update({ label_type: labelType, label_value: labelValue })
    .eq('id', labelId);

  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function deleteLabel(formData: FormData) {
  await requireRole(['moderator', 'staff', 'admin_service']);
  const labelId = requireString(formData, 'label_id');
  const revalidate = requireString(formData, 'revalidate');

  const supabase = supabaseServer();
  const { error } = await supabase.from('transcript_span_labels').delete().eq('id', labelId);

  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}
