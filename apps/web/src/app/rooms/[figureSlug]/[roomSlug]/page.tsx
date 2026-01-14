import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { PanelErrorBoundary } from '@/components/panel-error-boundary';
import { ModeratorQueuePanel } from '@/components/room/ModeratorQueuePanel';
import { QuestionQueueClient } from '@/components/room/QuestionQueueClient';
import { RecapPanel } from '@/components/room/RecapPanel';
import { RoomHeader } from '@/components/room/RoomHeader';
import { TranscriptPanel } from '@/components/room/TranscriptPanel';
import { createClient } from '@/lib/supabase/server';

type PageProps = {
  params: Promise<{ figureSlug: string; roomSlug: string }>;
};

const getCachedRoom = unstable_cache(
  async (figureSlug: string, roomSlug: string) => {
    const supabase = await createClient();

    const { data: figure } = await supabase
      .from('figures')
      .select('*')
      .eq('slug', figureSlug)
      .maybeSingle();

    if (!figure) return null;

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('figure_id', figure.id)
      .eq('slug', roomSlug)
      .maybeSingle();

    if (!room) return null;

    return { figure, room };
  },
  ['room:by-slug'],
  { revalidate: 60 },
);

const getCachedLiveSession = unstable_cache(
  async (roomId: string) => {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'live')
      .order('created_at', { ascending: false })
      .maybeSingle();

    return session ?? null;
  },
  ['session:live-by-room'],
  { revalidate: 5 },
);

const getCachedLatestSession = unstable_cache(
  async (roomId: string) => {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return session ?? null;
  },
  ['session:latest-by-room'],
  { revalidate: 60 },
);

export default async function RoomPage({ params }: PageProps) {
  const { figureSlug, roomSlug } = await params;

  const cached = await getCachedRoom(figureSlug, roomSlug);
  if (!cached) notFound();

  const { figure, room } = cached;

  const live = await getCachedLiveSession(room.id);
  const latest = await getCachedLatestSession(room.id);

  // If there is no session at all, show the room shell but no panels.
  const session = live ?? latest;

  const revalidate = async () => {
    'use server';
    await getCachedRoom.revalidate?.(figureSlug, roomSlug);
    await getCachedLiveSession.revalidate?.(room.id);
    await getCachedLatestSession.revalidate?.(room.id);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader
        figure={figure}
        room={room}
        isLive={Boolean(live)}
        sessionId={session?.id ?? null}
      />

      <main className="flex flex-1 flex-col gap-4 p-4">
        {!session ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">
            No sessions yet.
          </div>
        ) : (
          <>
            {/* Mobile / narrow layouts: queue first */}
            <div className="flex flex-col gap-4 lg:hidden">
              {live ? (
                <PanelErrorBoundary title="Queue error">
                  <QuestionQueueClient />
                </PanelErrorBoundary>
              ) : (
                <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                  No live session right now.
                </div>
              )}

              <PanelErrorBoundary title="Recap panel error">
                <RecapPanel sessionId={session.id} revalidate={revalidate} />
              </PanelErrorBoundary>

              <PanelErrorBoundary title="Transcript panel error">
                <TranscriptPanel sessionId={session.id} revalidate={revalidate} />
              </PanelErrorBoundary>
            </div>

            {/* Desktop layouts: left queue, right panels */}
            <div className="hidden flex-1 gap-4 lg:flex">
              <div className="w-[420px] shrink-0">
                {live ? (
                  <PanelErrorBoundary title="Queue error">
                    <QuestionQueueClient />
                  </PanelErrorBoundary>
                ) : (
                  <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                    No live session right now.
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <PanelErrorBoundary title="Recap panel error">
                  <RecapPanel sessionId={session.id} revalidate={revalidate} />
                </PanelErrorBoundary>

                <PanelErrorBoundary title="Transcript panel error">
                  <TranscriptPanel sessionId={session.id} revalidate={revalidate} />
                </PanelErrorBoundary>

                <PanelErrorBoundary title="Realtime queue error">
                  <ModeratorQueuePanel sessionId={session.id} />
                </PanelErrorBoundary>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
