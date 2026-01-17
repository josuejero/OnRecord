import Link from 'next/link';
import { cookies } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabaseServer } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require';
import { MapPin } from 'lucide-react';
import {
  EmptyPanel,
  ErrorPanel,
  Panel,
  PanelHeader,
  Page,
  PageHeader,
} from '@/components/layout';
import { RoomsIndexClient, type RoomIndexRow } from './RoomsIndexClient';

const isE2E = process.env.NEXT_PUBLIC_E2E === '1';

type RoomRow = {
  id: string;
  slug: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  public_figures: { slug: string; name: string } | null;
};

type RoomSessionRow = {
  id: string;
  room_id: string;
  status: 'scheduled' | 'live' | 'ended';
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

export default async function RoomsPage() {
  if (isE2E) {
    const cookieStore = await cookies();
    const ms = Number(cookieStore.get('e2e_delay_rooms_ms')?.value ?? 0);
    if (Number.isFinite(ms) && ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
  }

  const { user, role } = await requireRole(['reporter', 'moderator', 'staff', 'admin_service']);
  const supabase = supabaseServer();
  const disableRoomLinksPrefetch = process.env.NEXT_PUBLIC_DISABLE_ROOM_PREFETCH === 'true';
  const roomLinkPrefetch = disableRoomLinksPrefetch ? false : undefined;

  const { data: reporter } = await supabase
    .from('reporters')
    .select('credential_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select(
      'id, slug, title, created_at, updated_at, public_figures ( slug, name )',
    )
    .order('updated_at', { ascending: false });
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, room_id, status, starts_at, ends_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  const reporterPending = role === 'reporter' && reporter?.credential_status !== 'approved';
  if (sessionsError) {
    console.error('Unable to load room activity', sessionsError.message);
  }

  const activityByRoom = new Map<string, RoomSessionRow>();
  (sessions as RoomSessionRow[] | null)?.forEach((session) => {
    const previous = activityByRoom.get(session.room_id);
    const currentTime = new Date(
      session.updated_at ?? session.ends_at ?? session.starts_at ?? 0,
    ).getTime();
    const previousTime =
      previous &&
      new Date(
        previous.updated_at ?? previous.ends_at ?? previous.starts_at ?? 0,
      ).getTime();
    if (!previous || currentTime >= previousTime) {
      activityByRoom.set(session.room_id, session);
    }
  });
  const roomsList = ((rooms as RoomRow[] | null) ?? []).map((room) => {
    const figureName = room.public_figures?.name ?? 'Unknown figure';
    const figureSlug = room.public_figures?.slug ?? 'unknown';
    const lastSession = activityByRoom.get(room.id);
    return {
      id: room.id,
      slug: room.slug,
      title: room.title,
      figureName,
      figureSlug,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      lastSession:
        lastSession && lastSession.status
          ? {
              status: lastSession.status,
              updatedAt: lastSession.updated_at,
              startsAt: lastSession.starts_at,
              endsAt: lastSession.ends_at,
            }
          : undefined,
    };
  }) as RoomIndexRow[];
  const demoAction = (
    <Button size="sm" variant="outline" asChild>
      <Link href="/demo-room">Demo room</Link>
    </Button>
  );

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Rooms"
        description="Browse support rooms and enter any that have been created for your public figures."
        actions={demoAction}
      />

      <Panel header={<PanelHeader title="Account information" description="Your session context" />}>
        <div className="space-y-2 text-sm text-slate-600">
          <div>
            Signed in as: <span className="font-semibold text-slate-900">{user.email}</span>
          </div>
          <div>
            Role: <span className="font-semibold text-slate-900">{role}</span>
          </div>
        </div>
      </Panel>

      {reporterPending ? (
        <Alert variant="warning">
          <AlertTitle>Reporter credential pending</AlertTitle>
          <AlertDescription>
            Your reporter credential is{' '}
            <span className="font-semibold">{reporter?.credential_status ?? 'pending'}</span>. Until
            it is approved, room access is denied by the database.
          </AlertDescription>
        </Alert>
      ) : null}

      {roomsError ? (
        <ErrorPanel
          title="Unable to load rooms"
          description={roomsError.message}
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/rooms" prefetch={roomLinkPrefetch}>
                Retry
              </Link>
            </Button>
          }
        />
      ) : roomsList.length > 0 ? (
        <Panel header={<PanelHeader title="Available rooms" description="Scan for motivation, tap to jump in." />}>
          <RoomsIndexClient rooms={roomsList} roomLinkPrefetch={roomLinkPrefetch} />
        </Panel>
      ) : (
        <EmptyPanel
          icon={<MapPin className="h-6 w-6 text-slate-400" aria-hidden />}
          title="No rooms found"
          description={
            <>
              Rooms appear once a moderator creates them.{' '}
              {reporterPending
                ? 'Your reporter credential is still pending approval, so rooms remain hidden until it clears.'
                : 'If you expected rooms, ask your moderator to invite you or check back soon.'}{' '}
              Explore the demo room to see how things work.
            </>
          }
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/demo-room">Visit demo room</Link>
            </Button>
          }
        />
      )}
    </Page>
  );
}
