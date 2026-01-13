import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AudioInput from '@/components/audio/AudioInput';
import { Button } from '@/components/ui/button';
import { supabaseServer } from '@/lib/supabase/server';
import { processTranscript } from './actions';
import { getFeatureFlags } from '@/lib/config/features';

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
      <CardContent className="space-y-4">
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

        <form action={processTranscript} className="flex items-center gap-2">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="revalidate" value={revalidate} />
          <Button type="submit" variant="secondary">
            Cleanup + refresh insights
          </Button>
        </form>

        {transcript?.cleaned_text ? (
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Cleaned transcript preview
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">
              {transcript.cleaned_text.slice(0, 1200)}
            </pre>
          </details>
        ) : (
          <div className="text-sm text-muted-foreground">
            No cleaned transcript yet. Run cleanup to generate it.
          </div>
        )}

        {insights ? (
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">Latest metrics</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
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
                  <span key={t.term} className="rounded-full border px-2 py-1 text-xs">
                    {t.term} ({t.count})
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">
                No top terms yet. Add transcript text and run cleanup.
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No insights yet. Save a transcript, then run cleanup.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
