import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { PanelErrorBoundary } from '@/components/panel-error-boundary';
import { requireRole } from '@/lib/auth/require';
import { getFeatureFlags } from '@/lib/config/features';
import { supabaseServer } from '@/lib/supabase/server';

import { QuestionQueueClient } from './QuestionQueueClient';
import { RecapPanel, type RecapPanelProps } from './RecapPanel';
import { TranscriptPanel } from './TranscriptPanel';

type PageProps = {
  params: Promise<{ figureSlug: string; roomSlug: string }>;
};

export default async function RoomPage({ params }: PageProps) {
  const { figureSlug, roomSlug } = await params;

  // Require auth + role (matches how /rooms/page.tsx gates access)
  const { role } = await requireRole(['staff', 'moderator', 'reporter']);

  const supabase = supabaseServer();

  const getCachedRoom = unstable_cache(
    async () => {
      const { data: figure } = await supabase
        .from('public_figures')
        .select('*')
        .eq('slug', figureSlug)
        .maybeSingle();

      if (!figure) return null;

      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('public_figure_id', figure.id)
        .eq('slug', roomSlug)
        .maybeSingle();

      if (!room) return null;

      return { figure, room };
    },
    ['room:by-slug', figureSlug, roomSlug],
    { revalidate: 60 },
  );

  const cached = await getCachedRoom();
  if (!cached) notFound();

  const { figure, room } = cached;

  const getCachedLiveSession = unstable_cache(
    async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('room_id', room.id)
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .maybeSingle();

      return session ?? null;
    },
    ['session:live-by-room', room.id],
    { revalidate: 5 },
  );

  const getCachedLatestSession = unstable_cache(
    async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return session ?? null;
    },
    ['session:latest-by-room', room.id],
    { revalidate: 60 },
  );

  const [live, latest, featureFlags] = await Promise.all([
    getCachedLiveSession(),
    getCachedLatestSession(),
    getFeatureFlags(),
  ]);

  const session = live ?? latest;
  let recaps: RecapPanelProps['recaps'] = [];

  if (session) {
    const { data: recapRows, error: recapsError } = await supabase
      .from('transcript_ai_outputs')
      .select('id, prompt_version, provider, model_id, include_in_export, output, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });

    if (recapsError) throw new Error(recapsError.message);

    recaps = (recapRows ?? [])
      .map((row) => {
        if (!row?.id || !row.output) return null;
        return {
          id: row.id,
          prompt_version: row.prompt_version ?? 'recap-v1',
          provider: row.provider ?? 'browser',
          model_id: row.model_id ?? 'unknown',
          include_in_export: Boolean(row.include_in_export),
          created_at: row.created_at ?? new Date().toISOString(),
          recap: row.output,
        } as RecapPanelProps['recaps'][number];
      })
      .filter((entry): entry is RecapPanelProps['recaps'][number] => Boolean(entry));
  }
  const revalidatePath = `/rooms/${figureSlug}/${roomSlug}`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm text-muted-foreground">{figure.name}</div>
            <h1 className="truncate text-lg font-semibold">{room.title}</h1>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {live ? (
              <span className="rounded-full bg-green-500/15 px-2 py-1 text-green-700">
                Live
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                Not live
              </span>
            )}
          </div>
        </div>

        {/* Playwright expects this */}
        <span className="sr-only" data-testid="session-id">
          {session?.id ?? ''}
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {!session ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">
            No sessions yet.
          </div>
        ) : (
          <>
            {/* Mobile / narrow layouts */}
            <div className="flex flex-col gap-4 lg:hidden">
              <PanelErrorBoundary title="Queue error">
                <QuestionQueueClient
                  sessionId={session.id}
                  activeSessionId={live?.id ?? null}
                  role={role}
                />
              </PanelErrorBoundary>

              <PanelErrorBoundary title="Recap panel error">
                <RecapPanel
                  sessionId={session.id}
                  revalidatePath={revalidatePath}
                  recaps={recaps}
                  featureFlags={featureFlags}
                />
              </PanelErrorBoundary>

              <PanelErrorBoundary title="Transcript panel error">
                <TranscriptPanel sessionId={session.id} revalidate={revalidatePath} />
              </PanelErrorBoundary>
            </div>

            {/* Desktop layouts */}
            <div className="hidden flex-1 gap-4 lg:flex">
              <div className="w-[420px] shrink-0">
                <PanelErrorBoundary title="Queue error">
                  <QuestionQueueClient
                    sessionId={session.id}
                    activeSessionId={live?.id ?? null}
                    role={role}
                  />
                </PanelErrorBoundary>
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <PanelErrorBoundary title="Recap panel error">
                  <RecapPanel
                    sessionId={session.id}
                    revalidatePath={revalidatePath}
                    recaps={recaps}
                    featureFlags={featureFlags}
                  />
                </PanelErrorBoundary>

                <PanelErrorBoundary title="Transcript panel error">
                  <TranscriptPanel sessionId={session.id} revalidate={revalidatePath} />
                </PanelErrorBoundary>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
