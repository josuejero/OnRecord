import Link from 'next/link';

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

type DocLink = {
  label: string;
  href: string;
};

export default async function ReporterDashboard() {
  const { user } = await requireRole(['reporter']);
  const supabase = supabaseServer();

  const { data: recentRooms, error } = await supabase
    .from('rooms')
    .select('id, slug, title, updated_at, public_figures ( name, slug )')
    .order('updated_at', { ascending: false })
    .limit(4);
  if (error) {
    throw new Error(error.message);
  }

  const capabilities = [
    'Submit thoughtful questions and monitor their status in live rooms.',
    'Flag answers that need moderator review or additional labels.',
    'Preview recaps before they go public and capture missing context.',
    'Coordinate with moderators when credentialing or room access changes.',
  ];

  const docLinks: DocLink[] = [
    { label: 'Reporter quick start', href: '/docs/pr-checklist.md' },
    { label: 'Demo room flow', href: '/docs/demo-script.md' },
    { label: 'Seed plan + guidelines', href: '/docs/seed-plan.md' },
  ];

  const roomList: RecentRoom[] = recentRooms ?? [];

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Reporter workspace"
        description={`Signed in as ${user.email}. Focus on the stories and let moderators handle the controls.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/rooms">Jump to rooms</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Primary actions</CardTitle>
              <CardDescription>Move quickly between essential views.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button size="sm" variant="secondary" asChild>
                <Link href="/rooms">Browse rooms</Link>
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <Link href="/recaps">Public recaps</Link>
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Keep a finger on the pulse of public figures, open pending rooms, or jump into recaps.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>What reporters do</CardTitle>
              <CardDescription>Focus areas for this role.</CardDescription>
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

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent rooms</CardTitle>
            <CardDescription>Where public figures are live or queued.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {roomList.length === 0 ? (
            <p className="text-sm text-slate-500">No rooms yet. Await moderator invitations.</p>
          ) : (
            roomList.map((room) => {
              const figure = room.public_figures?.[0];
              const figureName = figure?.name ?? 'Unknown figure';
              const figureSlug = figure?.slug ?? '';
              const roomUrl =
                figureSlug && room.slug ? `/rooms/${figureSlug}/${room.slug}` : '/rooms';
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
            <CardTitle>Quick docs</CardTitle>
            <CardDescription>Reference material for reporters.</CardDescription>
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
