import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AudioInput from '@/components/audio/AudioInput';
import { Button } from '@/components/ui/button';
import { supabaseServer } from '@/lib/supabase/server';
import { processTranscript } from './actions';
import { getFeatureFlags } from '@/lib/config/features';
import { TranscriptViewer, type TranscriptSpanLabel } from './TranscriptViewer';

type TranscriptTopTerm = { term: string; count: number };

type TranscriptInsightRow = {
  computed_at: string;
  questions_total: number | null;
  questions_answered: number | null;
  questions_rejected: number | null;
  rejection_rate: number | null;
  avg_time_to_answer_seconds: number | null;
  top_terms: TranscriptTopTerm[] | null;
  transcript_word_count: number | null;
};

type TranscriptPanelProps = {
  sessionId: string;
  revalidate: string;
};

export async function TranscriptPanel({ sessionId, revalidate }: TranscriptPanelProps) {
  const supabase = supabaseServer();

  const { data: transcript } = await supabase
    .from('session_transcripts')
    .select('raw_text, cleaned_text, processed_at, updated_at')
    .eq('session_id', sessionId)
    .maybeSingle();

  const { data } = await supabase
    .from('session_insights')
    .select(
      'computed_at, questions_total, questions_answered, questions_rejected, rejection_rate, avg_time_to_answer_seconds, top_terms, transcript_word_count',
    )
    .eq('session_id', sessionId)
    .maybeSingle();

  const insights = data as TranscriptInsightRow | null;
  const { data: labelRows } = await supabase
    .from('transcript_span_labels')
    .select('start_offset, end_offset, label_type, label_value')
    .eq('session_id', sessionId)
    .order('start_offset', { ascending: true });
  const transcriptLabels = (labelRows ?? []) as TranscriptSpanLabel[];

  const featureFlags = getFeatureFlags();

  const rejectionRate = insights?.rejection_rate;
  const formattedRejection =
    rejectionRate !== null && rejectionRate !== undefined
      ? `${(Number(rejectionRate) * 100).toFixed(1)}%`
      : '—';

  const avgTimeSeconds = insights?.avg_time_to_answer_seconds;
  const formattedAvgTime =
    avgTimeSeconds !== null && avgTimeSeconds !== undefined
      ? `${Math.round(Number(avgTimeSeconds))}s`
      : '—';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript & Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Session ID: <span className="font-mono">{sessionId}</span>
            </div>
            <AudioInput
              sessionId={sessionId}
              revalidatePath={revalidate}
              initialText={transcript?.raw_text ?? ''}
              voiceInputEnabled={featureFlags.voiceInputEnabled}
              voiceUploadEnabled={featureFlags.voiceUploadEnabled}
            />
          </div>
          <form action={processTranscript} className="space-y-2 text-sm text-slate-600">
            <input type="hidden" name="session_id" value={sessionId} />
            <input type="hidden" name="revalidate" value={revalidate} />
            <div className="flex flex-col gap-2">
              <Button type="submit" variant="outline">
                Cleanup + refresh insights
              </Button>
              <p className="text-xs text-muted-foreground">
                Re-run cleanup to refresh the cleaned transcript and metrics.
              </p>
            </div>
          </form>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            {transcript?.cleaned_text ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Cleaned transcript preview
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs text-slate-800">
                  {transcript.cleaned_text.slice(0, 1200)}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                No cleaned transcript yet. Run cleanup to generate it.
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            {insights ? (
              <>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Latest metrics
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>Questions: {insights.questions_total ?? '—'}</div>
                  <div>Answered: {insights.questions_answered ?? '—'}</div>
                  <div>Rejected: {insights.questions_rejected ?? '—'}</div>
                  <div>Rejection rate: {formattedRejection}</div>
                  <div>Avg time-to-answer: {formattedAvgTime}</div>
                  <div>Transcript words: {insights.transcript_word_count ?? '—'}</div>
                </div>
                {insights?.top_terms && insights.top_terms.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {insights.top_terms.slice(0, 12).map((t) => (
                      <span
                        key={t.term}
                        className="rounded-full border border-slate-200 px-2 py-1 text-[0.65rem]"
                      >
                        {t.term} ({t.count})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    No top terms yet. Add transcript text and run cleanup.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">
                No insights yet. Save a transcript, then run cleanup.
              </p>
            )}
          </div>
        </div>

        <div className="flex h-[28rem] min-h-[22rem] flex-col">
          <TranscriptViewer
            cleanedText={transcript?.cleaned_text ?? ''}
            rawText={transcript?.raw_text ?? ''}
            labels={transcriptLabels}
            processedAt={transcript?.processed_at ?? null}
            updatedAt={transcript?.updated_at ?? null}
          />
        </div>
      </CardContent>
    </Card>
  );
}
