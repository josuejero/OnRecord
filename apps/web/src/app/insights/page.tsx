import Link from 'next/link';
import { requireRole } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';

function fmtSeconds(v: number | null | undefined) {
  if (v === null || v === undefined) return '—';
  const s = Math.round(v ?? 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

type TopTerm = { term: string; count: number };

type SessionInsightRow = {
  computed_at: string;
  questions_total: number | null;
  questions_answered: number | null;
  questions_rejected: number | null;
  rejection_rate: number | null;
  avg_time_to_answer_seconds: number | null;
  transcript_word_count: number | null;
  top_terms: TopTerm[] | null;
};

type PublicFigureRow = {
  name: string;
  slug: string;
};

type RoomRow = {
  title: string;
  slug: string;
  public_figures?: PublicFigureRow[] | null;
};

type InsightsSessionRow = {
  id: string;
  status: string;
  rooms?: RoomRow[] | null;
  session_insights?: SessionInsightRow[] | null;
};

export default async function InsightsPage() {
  await requireRole(['moderator', 'staff', 'admin_service']);

  const supabase = supabaseServer();
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      `id, status, starts_at, ends_at,
       rooms ( title, slug, public_figures ( name, slug ) ),
       session_insights ( computed_at, questions_total, questions_answered, questions_rejected, rejection_rate, avg_time_to_answer_seconds, transcript_word_count, top_terms )`,
    )
    .order('starts_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const sessionRows = (sessions ?? []) as InsightsSessionRow[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Session-level metrics (cached in <code className="font-mono">session_insights</code>). Run
          &ldquo;Cleanup + refresh insights&rdquo; from a room to update.
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Room</th>
              <th className="p-3">Session</th>
              <th className="p-3">Answered</th>
              <th className="p-3">Rejected</th>
              <th className="p-3">Rejection rate</th>
              <th className="p-3">Avg time-to-answer</th>
              <th className="p-3">Top terms</th>
            </tr>
          </thead>
          <tbody>
            {sessionRows.map((s) => {
              const ins = s.session_insights?.[0] ?? null;
              const rejectionRateValue = ins?.rejection_rate;
              const avgTimeValue = ins?.avg_time_to_answer_seconds;
              const primaryRoom = s.rooms?.[0] ?? null;
              const primaryFigure = primaryRoom?.public_figures?.[0] ?? null;
              const roomTitle = primaryRoom?.title ?? 'Room';
              const figure = primaryFigure?.name ?? 'Figure';
              const roomUrl =
                primaryRoom && primaryFigure && primaryRoom.slug && primaryFigure.slug
                  ? `/rooms/${primaryFigure.slug}/${primaryRoom.slug}`
                  : '#';

              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{figure}</div>
                    <div className="text-muted-foreground">{roomTitle}</div>
                  </td>
                  <td className="p-3">
                    <Link className="underline" href={roomUrl}>
                      {s.status}
                    </Link>
                  </td>
                  <td className="p-3">
                    {ins?.questions_answered ?? '—'} / {ins?.questions_total ?? '—'}
                  </td>
                  <td className="p-3">{ins?.questions_rejected ?? '—'}</td>
                  <td className="p-3">
                    {rejectionRateValue != null
                      ? `${(Number(rejectionRateValue) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="p-3">
                    {avgTimeValue != null ? fmtSeconds(Number(avgTimeValue)) : '—'}
                  </td>
                  <td className="p-3">
                    {ins?.top_terms && ins.top_terms.length ? (
                      <div className="flex flex-wrap gap-2">
                        {ins.top_terms.slice(0, 6).map((t) => (
                          <span key={t.term} className="rounded-full border px-2 py-1 text-xs">
                            {t.term}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: If a row shows dashes, open that room session and run &ldquo;Cleanup + refresh
        insights&rdquo; to populate the cache.
      </div>
    </div>
  );
}
