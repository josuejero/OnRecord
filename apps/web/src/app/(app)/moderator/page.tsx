import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Page, PageHeader } from '@/components/layout';
import { requireRole } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type RecentRoom = {
  id: string;
  slug: string;
  title: string;
  updated_at: string | null;
  public_figures?: { name: string; slug: string }[] | null;
};

type RecentSession = {
  id: string;
  status: string;
  starts_at: string | null;
  room?: {
    title: string;
    slug: string;
    public_figures?: { name: string; slug: string }[] | null;
  } | null;
};

type DocLink = {
  label: string;
  href: string;
};

export default async function ModeratorDashboard() {
  const { user, role } = await requireRole(['moderator', 'staff', 'admin_service']);
  const supabase = supabaseServer();

  const { data: recentRooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, slug, title, updated_at, public_figures ( name, slug )')
    .order('updated_at', { ascending: false })
    .limit(3);
  if (roomsError) {
    throw new Error(roomsError.message);
  }

  const { data: recentSessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(
      `id, status, starts_at,
       room ( title, slug, public_figures ( name, slug ) )`,
    )
    .order('starts_at', { ascending: false })
    .limit(4);
  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const capabilities = [
    'Start, monitor, and end sessions to keep the question queue under control.',
    'Review transcripts and label suspicious answers before recaps go live.',
    'Lean on insights to spot rejected questions or slow responses.',
    'Escalate policy concerns and coordinate handoffs with staff.',
  ];

  const docLinks: DocLink[] = [
    { label: 'Moderator checklist', href: '/docs/pr-checklist.md' },
    { label: 'Rapid session playbook', href: '/docs/demo-script.md' },
    { label: 'Data retention guide', href: '/docs/data-retention.md' },
  ];

  const roomList: RecentRoom[] = recentRooms ?? [];
  const sessionList: RecentSession[] = recentSessions ?? [];

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Moderator cockpit"
        description={`Signed in as ${user.email}. ${role.charAt(0).toUpperCase() + role.slice(1)} privileges unlock room controls, session oversight, and rapid intervention.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/rooms">Browse rooms</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Primary actions</CardTitle>
              <CardDescription>Launch high-leverage workflows.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button size="sm" variant="secondary" asChild>
                <Link href="/rooms">View rooms</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/insights">Inspect sessions</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/recaps">Public recaps</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Use this space to jump directly into rooms or the insights view whenever you
              need a pulse on recent activity.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Role capabilities</CardTitle>
              <CardDescription>What you can control today.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent rooms</CardTitle>
              <CardDescription>Last rooms updated or created.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {roomList.length === 0 ? (
              <p className="text-sm text-slate-500">No rooms yet. Create the first one to get started.</p>
            ) : (
              roomList.map((room) => {
                const figure = room.public_figures?.[0];
                const figureName = figure?.name ?? 'Unknown figure';
                const figureSlug = figure?.slug ?? '';
                const roomUrl =
                  figureSlug && room.slug
                    ? `/rooms/${figureSlug}/${room.slug}`
                    : '/rooms';
                return (
                  <article
                    key={room.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-sm text-slate-800"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Public figure
                        </p>
                        <p className="font-semibold text-slate-900">{figureName}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={roomUrl}>Open room</Link>
                      </Button>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">{room.title}</p>
                    <p className="text-xs text-slate-500">
                      Updated{' '}
                      {room.updated_at
                        ? DATE_FORMATTER.format(new Date(room.updated_at))
                        : 'recently'}
                    </p>
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent sessions</CardTitle>
              <CardDescription>Monitor active or recent queues.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionList.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions yet.</p>
            ) : (
              sessionList.map((session) => {
                const room = session.room;
                const figure = room?.public_figures?.[0];
                const figureName = figure?.name ?? 'Figure';
                const roomTitle = room?.title ?? 'Room';
                const roomUrl = figure?.slug && room?.slug ? `/rooms/${figure.slug}/${room.slug}` : '/rooms';
                return (
                  <article
                    key={session.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={session.status === 'live' ? 'destructive' : 'outline'}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </Badge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={roomUrl}>Go to room</Link>
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {figureName}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">{roomTitle}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {session.starts_at
                        ? DATE_FORMATTER.format(new Date(session.starts_at))
                        : 'Schedule pending'}
                    </p>
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Internal docs</CardTitle>
            <CardDescription>Helpful references for moderators.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            {docLinks.map((doc) => (
              <Link
                key={doc.label}
                href={doc.href}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-800 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-900 hover:text-slate-900"
                target="_blank"
                rel="noreferrer"
              >
                {doc.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </Page>
  );
}
