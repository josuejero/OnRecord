import { unstable_cache } from 'next/cache';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PanelErrorBoundary } from '@/components/panel-error-boundary';
import { Page, PageHeader, Panel, PanelHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { requireRole } from '@/lib/auth/require';
import { getFeatureFlags } from '@/lib/config/features';
import { supabaseServer } from '@/lib/supabase/server';

import { QuestionQueueClient } from './QuestionQueueClient';
import { RecapPanel, type RecapPanelProps } from './RecapPanel';
import { AssetUploadPanel } from './AssetUploadPanel';
import { RecapPublishPanel } from './RecapPublishPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { RoomHeaderActions } from './RoomHeaderActions';
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

type RoomSession = Awaited<ReturnType<typeof fetchLiveSession>>;

type PageProps = {
  params: Promise<{ figureSlug: string; roomSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default async function RoomPage({ params, searchParams }: PageProps) {
  const { figureSlug, roomSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const e2eRoomErrorParam = resolvedSearchParams?.__e2e_room_error;
  const shouldThrowRoomError =
    process.env.NEXT_PUBLIC_E2E === '1' &&
    (e2eRoomErrorParam === '1' ||
      (Array.isArray(e2eRoomErrorParam) && e2eRoomErrorParam.includes('1')));
  if (shouldThrowRoomError) {
    throw new Error('e2e_room_error');
  }

  if (isE2E) {
    const cookieStore = await cookies();
    const ms = Number(cookieStore.get('e2e_delay_room_detail_ms')?.value ?? 0);
    if (Number.isFinite(ms) && ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

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
  const canControlSession = role === 'moderator' || role === 'staff' || role === 'admin_service';
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
  const queueCounts = session
    ? await loadQueueCounts(session.id, supabase)
    : EMPTY_QUEUE_COUNTS;

  const headerDescription = <div className="text-sm text-muted-foreground">{figure.name}</div>;

  return (
    <Page className="flex min-h-dvh flex-col gap-4">
      <PageHeader
        title={room.title}
        description={headerDescription}
        actions={<RoomHeaderActions />}
      />
      <span className="sr-only" data-testid="session-id">
        {session?.id ?? ''}
      </span>

      {session ? (
        <>
          <StickySessionHeader
            session={session}
            queueCounts={queueCounts}
            isLive={isLive}
            room={room}
          />
          <main className="flex-1 min-h-0 space-y-4">
            <div className="lg:hidden">
              <Tabs defaultValue="queue">
                <TabsList className="w-full rounded-full border border-slate-200 bg-white p-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-sm">
                  <TabsTrigger value="queue">Queue</TabsTrigger>
                  <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  <TabsTrigger value="recap">Recap</TabsTrigger>
                </TabsList>

                <TabsContent value="queue">
                  <div className="space-y-4">
                    <QueuePanel
                      sessionId={session.id}
                      activeSessionId={live?.id ?? null}
                      role={role}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="transcript">
                  <div className="space-y-4">
                    <TranscriptPanelSection
                      sessionId={session.id}
                      revalidatePath={revalidatePath}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="recap">
                  <div className="space-y-4">
                    <SessionControlSection
                      session={session}
                      sessionToControl={sessionToControl}
                      live={live}
                      canControlSession={canControlSession}
                      room={room}
                      figure={figure}
                      revalidatePath={revalidatePath}
                    />
                    <RecapPanelSection
                      sessionId={session.id}
                      revalidatePath={revalidatePath}
                      recaps={recaps}
                      featureFlags={featureFlags}
                    />
                    <AssetPanel sessionId={session.id} revalidatePath={revalidatePath} />
                    <RecapPublishSection
                      sessionId={session.id}
                      figureSlug={figure.slug}
                      figureName={figure.name}
                      roomSlug={room.slug}
                      roomTitle={room.title}
                      revalidatePath={revalidatePath}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="hidden lg:grid h-full min-h-0 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,360px)] lg:gap-4">
              <div id="queue-panel" className="flex flex-col gap-4">
                <QueuePanel
                  className="h-full"
                  sessionId={session.id}
                  activeSessionId={live?.id ?? null}
                  role={role}
                />
              </div>

              <div className="flex flex-col gap-4">
                <TranscriptPanelSection
                  className="h-full"
                  sessionId={session.id}
                  revalidatePath={revalidatePath}
                />
              </div>

              <div className="flex flex-col gap-4">
                <SessionControlSection
                  session={session}
                  sessionToControl={sessionToControl}
                  live={live}
                  canControlSession={canControlSession}
                  room={room}
                  figure={figure}
                  revalidatePath={revalidatePath}
                />
                <RecapPanelSection
                  sessionId={session.id}
                  revalidatePath={revalidatePath}
                  recaps={recaps}
                  featureFlags={featureFlags}
                />
                <AssetPanel sessionId={session.id} revalidatePath={revalidatePath} />
                <RecapPublishSection
                  className="bg-slate-50/80"
                  sessionId={session.id}
                  figureSlug={figure.slug}
                  figureName={figure.name}
                  roomSlug={room.slug}
                  roomTitle={room.title}
                  revalidatePath={revalidatePath}
                />
              </div>
            </div>
          </main>
        </>
      ) : (
        <Panel className="text-sm text-muted-foreground">No sessions yet.</Panel>
      )}
    </Page>
  );
}

const panelBodyClass = 'flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto';

const EMPTY_QUEUE_COUNTS: QueueCounts = {
  pending: 0,
  needsEdit: 0,
  approved: 0,
  answered: 0,
  rejected: 0,
};

type QueueCounts = {
  pending: number;
  needsEdit: number;
  approved: number;
  answered: number;
  rejected: number;
};

async function loadQueueCounts(
  sessionId: string,
  supabase: ReturnType<typeof supabaseServer>,
): Promise<QueueCounts> {
  const { data, error } = await supabase
    .from('questions')
    .select('status')
    .eq('session_id', sessionId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).reduce<QueueCounts>((acc, row) => {
    if (row.status === 'needs_edit') {
      acc.needsEdit += 1;
      return acc;
    }
    if (row.status === 'pending') {
      acc.pending += 1;
      return acc;
    }
    if (row.status === 'approved') {
      acc.approved += 1;
      return acc;
    }
    if (row.status === 'answered') {
      acc.answered += 1;
      return acc;
    }
    if (row.status === 'rejected') {
      acc.rejected += 1;
      return acc;
    }
    return acc;
  }, { ...EMPTY_QUEUE_COUNTS });
}

function StickySessionHeader({
  session,
  queueCounts,
  isLive,
  room,
}: {
  session: RoomSession;
  queueCounts: QueueCounts;
  isLive: boolean;
  room: (typeof getCachedRoom) extends (...args: unknown[]) => infer R
    ? NonNullable<Awaited<R>>['room']
    : never;
}) {
  const pendingTotal = queueCounts.pending + queueCounts.needsEdit;
  const stateLabel = session.status === 'live' ? 'Live' : session.status === 'scheduled' ? 'Scheduled' : 'Ended';
  const startTimestamp = formatTimestamp(session.starts_at);
  const elapsed = formatElapsed(session.starts_at, session.ends_at, isLive);

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">{room.title}</h2>
            <Badge variant="secondary">{stateLabel}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Starts: <span className="font-semibold text-slate-900">{startTimestamp}</span>{' '}
            · Elapsed: <span className="font-semibold text-slate-900">{elapsed}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
          <SessionCounter
            label="Pending"
            value={pendingTotal}
            helper={queueCounts.needsEdit ? `${queueCounts.needsEdit} needs edit` : undefined}
          />
          <SessionCounter label="Approved" value={queueCounts.approved} />
          <SessionCounter label="Answered" value={queueCounts.answered} />
          <SessionCounter label="Rejected" value={queueCounts.rejected} />
        </div>
      </div>
    </div>
  );
}

function SessionCounter({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-xs font-semibold text-slate-900" data-testid={`queue-count-${label.toLowerCase()}`}>
        {value}
      </span>
      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">{label}</span>
      {helper ? <span className="text-[0.55rem] text-slate-400">{helper}</span> : null}
    </div>
  );
}

function SessionControlSection({
  session,
  sessionToControl,
  live,
  canControlSession,
  room,
  figure,
  revalidatePath,
  className,
}: {
  session: RoomSession | null;
  sessionToControl: RoomSession | null;
  live: RoomSession | null;
  canControlSession: boolean;
  room: (typeof getCachedRoom) extends (...args: unknown[]) => infer R
    ? NonNullable<Awaited<R>>['room']
    : never;
  figure: (typeof getCachedRoom) extends (...args: unknown[]) => infer R
    ? NonNullable<Awaited<R>>['figure']
    : never;
  revalidatePath: string;
  className?: string;
}) {
  const isLive = Boolean(live);

  return (
    <Panel className={cn('flex flex-col overflow-hidden', className)} header={<PanelHeader title="Session controls" description={`Session ID: ${session?.id ?? ''}`} />}>
      <div className={panelBodyClass}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Current status: <span className="font-semibold text-slate-900">{session?.status ?? '—'}</span>
          </p>
          <p className="text-xs text-slate-500">
            Room controlled by {figure.name} · {room.title}
          </p>
        </div>

        {canControlSession && sessionToControl && !isLive ? (
          <form action={startSession} className="space-y-2">
            <input type="hidden" name="session_id" value={sessionToControl.id} />
            <input type="hidden" name="room_id" value={room.id} />
            <input type="hidden" name="revalidate" value={revalidatePath} />
            <Button type="submit" variant="outline" size="sm">
              Start session
            </Button>
          </form>
        ) : null}

        {canControlSession && live ? (
          <form action={endSession} className="space-y-2">
            <input type="hidden" name="session_id" value={live.id} />
            <input type="hidden" name="room_id" value={room.id} />
            <input type="hidden" name="revalidate" value={revalidatePath} />
            <Button type="submit" variant="destructive" size="sm">
              End session
            </Button>
          </form>
        ) : null}
      </div>
    </Panel>
  );
}

function QueuePanel({
  sessionId,
  activeSessionId,
  role,
  className,
}: {
  sessionId: string;
  activeSessionId: string | null;
  role: 'reporter' | 'moderator' | 'staff' | 'admin_service';
  className?: string;
}) {
  return (
    <PanelErrorBoundary title="Queue error">
      <Panel
        className={cn('flex flex-col overflow-hidden', className)}
        header={<PanelHeader title="Queue" description="Track questions and moderation" />}
      >
        <div className={panelBodyClass}>
          <QuestionQueueClient sessionId={sessionId} activeSessionId={activeSessionId} role={role} />
        </div>
      </Panel>
    </PanelErrorBoundary>
  );
}

function TranscriptPanelSection({
  sessionId,
  revalidatePath,
  className,
}: {
  sessionId: string;
  revalidatePath: string;
  className?: string;
}) {
  return (
    <PanelErrorBoundary title="Transcript panel error">
      <Panel
        className={cn('flex flex-col overflow-hidden', className)}
        header={<PanelHeader title="Transcript" description="Live feed with search + highlights" />}
      >
        <div className={panelBodyClass}>
          <TranscriptPanel sessionId={sessionId} revalidate={revalidatePath} />
        </div>
      </Panel>
    </PanelErrorBoundary>
  );
}

function RecapPanelSection({
  sessionId,
  revalidatePath,
  recaps,
  featureFlags,
  className,
}: {
  sessionId: string;
  revalidatePath: string;
  recaps: RecapPanelProps['recaps'];
  featureFlags: Awaited<ReturnType<typeof getFeatureFlags>>;
  className?: string;
}) {
  return (
    <PanelErrorBoundary title="Recap panel error">
      <Panel
        className={cn('flex flex-col overflow-hidden', className)}
        header={<PanelHeader title="Session recap" description="AI-assisted summary + notes" />}
      >
        <div className={panelBodyClass}>
          <RecapPanel
            sessionId={sessionId}
            revalidatePath={revalidatePath}
            recaps={recaps}
            featureFlags={featureFlags}
          />
        </div>
      </Panel>
    </PanelErrorBoundary>
  );
}

function AssetPanel({
  sessionId,
  revalidatePath,
  className,
}: {
  sessionId: string;
  revalidatePath: string;
  className?: string;
}) {
  return (
    <PanelErrorBoundary title="Asset upload error">
      <Panel
        className={cn('flex flex-col overflow-hidden', className)}
        header={<PanelHeader title="Assets" description="Upload supporting files" />}
      >
        <div className={panelBodyClass}>
          <AssetUploadPanel sessionId={sessionId} revalidatePath={revalidatePath} />
        </div>
      </Panel>
    </PanelErrorBoundary>
  );
}

function RecapPublishSection({
  sessionId,
  figureSlug,
  figureName,
  roomSlug,
  roomTitle,
  revalidatePath,
  className,
}: {
  sessionId: string;
  figureSlug: string;
  figureName: string;
  roomSlug: string;
  roomTitle: string;
  revalidatePath: string;
  className?: string;
}) {
  return (
    <PanelErrorBoundary title="Publish error">
      <Panel
        className={cn('flex flex-col overflow-hidden', className)}
        header={<PanelHeader title="Publish" description="Publish a public recap" />}
      >
        <div className={panelBodyClass}>
          <RecapPublishPanel
            sessionId={sessionId}
            figureSlug={figureSlug}
            figureName={figureName}
            roomSlug={roomSlug}
            roomTitle={roomTitle}
            revalidatePath={revalidatePath}
          />
        </div>
      </Panel>
    </PanelErrorBoundary>
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  return DATE_FORMATTER.format(new Date(value));
}

function formatElapsed(start?: string | null, end?: string | null, isLive = false) {
  if (!start) return '—';
  const startMs = new Date(start).getTime();
  const endMs = isLive ? Date.now() : end ? new Date(end).getTime() : Date.now();
  const diffMs = Math.max(0, endMs - startMs);
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
