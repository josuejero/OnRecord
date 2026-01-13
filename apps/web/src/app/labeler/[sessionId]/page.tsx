import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';
import { LabelerClient } from './LabelerClient';
import type { LabelRow } from './types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '—';
  return DATE_FORMATTER.format(new Date(value));
}

export default async function LabelerPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  await requireRole(['moderator', 'staff', 'admin_service']);
  const supabase = supabaseServer();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status, starts_at, ends_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Unable to load session: ${sessionError.message}`);
  }

  if (!session) {
    notFound();
  }

  const { data: transcript, error: transcriptError } = await supabase
    .from('session_transcripts')
    .select('session_id, raw_text, cleaned_text')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (transcriptError) {
    throw new Error(`Unable to load transcript: ${transcriptError.message}`);
  }

  const transcriptText = transcript?.cleaned_text ?? transcript?.raw_text ?? '';

  const { data: labelRows, error: labelsError } = await supabase
    .from('transcript_span_labels')
    .select(
      'id, session_id, transcript_id, start_offset, end_offset, label_type, label_value, created_at',
    )
    .eq('session_id', sessionId)
    .order('start_offset', { ascending: true });

  if (labelsError) {
    throw new Error(`Unable to load labels: ${labelsError.message}`);
  }

  const { data: recapRow } = await supabase
    .from('recap_pages')
    .select('slug, published_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  const recapSlug = recapRow?.published_at ? recapRow.slug : null;
  const revalidatePath = `/labeler/${encodeURIComponent(sessionId)}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Session labeler (staff)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span>Session status:</span>
            <Badge variant="secondary">{session.status}</Badge>
          </div>
          <div>
            Session ID: <span className="font-mono text-slate-900">{session.id}</span>
          </div>
          <div>
            Starts:{' '}
            <span className="font-semibold text-slate-900">
              {formatTimestamp(session.starts_at)}
            </span>
          </div>
          <div>
            Ends:{' '}
            <span className="font-semibold text-slate-900">{formatTimestamp(session.ends_at)}</span>
          </div>
        </CardContent>
      </Card>

      <LabelerClient
        sessionId={sessionId}
        transcriptId={transcript?.session_id ?? null}
        transcriptText={transcriptText}
        labels={(labelRows as LabelRow[] | null) ?? []}
        recapSlug={recapSlug}
        revalidatePath={revalidatePath}
      />
    </div>
  );
}
