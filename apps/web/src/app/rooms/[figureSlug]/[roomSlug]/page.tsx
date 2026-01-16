import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { PanelErrorBoundary } from '@/components/panel-error-boundary';
import { cn } from '@/lib/utils';
import { requireRole } from '@/lib/auth/require';
import { getFeatureFlags } from '@/lib/config/features';
import { supabaseServer } from '@/lib/supabase/server';

import { QuestionQueueClient } from './QuestionQueueClient';
import { RecapPanel, type RecapPanelProps } from './RecapPanel';
import { AssetUploadPanel } from './AssetUploadPanel';
import { RecapPublishPanel } from './RecapPublishPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { startSession, endSession } from './actions';

const isE2E = process.env.NEXT_PUBLIC_E2E === '1';

async function fetchLiveSession(
  roomId: string,
  supabase: ReturnType<typeof supabaseServer>,
) {
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('room_id', roomId)
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .maybeSingle();

  return session ?? null;
}

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

  const getLiveSession = isE2E
    ? async () => fetchLiveSession(room.id, supabase)
    : unstable_cache(
        async () => fetchLiveSession(room.id, supabase),
        [`liveSession:${room.id}`],
        {
          revalidate: 5,
          tags: [`room:${room.id}:liveSession`],
        },
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
    getLiveSession(),
    getCachedLatestSession(),
    getFeatureFlags(),
  ]);

  const session = live ?? latest;
  const canControlSession = role === 'moderator' || role === 'staff';
  const isLive = Boolean(live);
  const sessionToControl = live ?? latest;
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
            <h1 className="truncate text-lg font-semibold" data-testid="room-title">
              {room.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span
              data-testid="session-status-badge"
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                isLive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800',
              )}
            >
              {isLive ? 'Live' : 'Not live'}
            </span>

            {canControlSession && sessionToControl && !isLive && (
              <form action={startSession}>
                <input type="hidden" name="session_id" value={sessionToControl.id} />
                <input type="hidden" name="room_id" value={room.id} />
                <input type="hidden" name="revalidate" value={revalidatePath} />
                <button data-testid="session-start" type="submit" className="ml-2">
                  Start session
                </button>
              </form>
            )}

            {canControlSession && live && (
              <form action={endSession}>
                <input type="hidden" name="session_id" value={live.id} />
                <input type="hidden" name="room_id" value={room.id} />
                <input type="hidden" name="revalidate" value={revalidatePath} />
                <button data-testid="session-end" type="submit" className="ml-2">
                  End session
                </button>
              </form>
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

              <PanelErrorBoundary title="Publish error">
                <RecapPublishPanel
                  sessionId={session.id}
                  figureSlug={figure.slug}
                  figureName={figure.name}
                  roomSlug={room.slug}
                  roomTitle={room.title}
                  revalidatePath={revalidatePath}
                />
              </PanelErrorBoundary>

              <PanelErrorBoundary title="Asset upload error">
                <AssetUploadPanel sessionId={session.id} revalidatePath={revalidatePath} />
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

                <PanelErrorBoundary title="Publish error">
                  <RecapPublishPanel
                    sessionId={session.id}
                    figureSlug={figure.slug}
                    figureName={figure.name}
                    roomSlug={room.slug}
                    roomTitle={room.title}
                    revalidatePath={revalidatePath}
                  />
                </PanelErrorBoundary>

                <PanelErrorBoundary title="Asset upload error">
                  <AssetUploadPanel sessionId={session.id} revalidatePath={revalidatePath} />
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
