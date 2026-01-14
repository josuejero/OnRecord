import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/empty-state';
import { supabaseServer } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require';
import { MapPin } from 'lucide-react';

type RoomRow = {
  id: string;
  slug: string;
  title: string;
  public_figures: { slug: string; name: string } | null;
};

export default async function RoomsPage() {
  const { user, role } = await requireRole(['reporter', 'moderator', 'staff', 'admin_service']);
  const supabase = supabaseServer();

  const { data: reporter } = await supabase
    .from('reporters')
    .select('credential_status')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, slug, title, public_figures ( slug, name )')
    .order('created_at', { ascending: false });

  const reporterPending = role === 'reporter' && reporter?.credential_status !== 'approved';

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle data-testid="rooms-title">Rooms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div>
            Signed in as: <span className="font-semibold text-slate-900">{user.email}</span>
          </div>
          <div>
            Role: <span className="font-semibold text-slate-900">{role}</span>
          </div>
        </CardContent>
      </Card>

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

      {error ? (
        <Alert variant="error">
          <AlertTitle>Unable to load rooms</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(rooms as RoomRow[] | null)?.map((room) => {
          const figSlug = room.public_figures?.slug ?? 'unknown';
          return (
            <Card
              key={room.id}
              className="group border border-slate-200 bg-white transition hover:shadow-lg focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-primary/60"
            >
              <CardHeader>
                <CardTitle className="text-base">{room.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="text-slate-500">Public figure</div>
                <div className="font-semibold text-slate-900">
                  {room.public_figures?.name ?? 'Unknown'}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full justify-center">
                  <Link
                    href={`/rooms/${encodeURIComponent(figSlug)}/${encodeURIComponent(room.slug)}`}
                  >
                    Open room
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!rooms?.length && !error ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6 text-slate-400" aria-hidden />}
          title="No rooms found"
          description={
            <>
              Rooms appear once a moderator creates them.{' '}
              {reporterPending
                ? 'Your reporter credential is still pending approval, so rooms remain hidden until it clears.'
                : 'If you expected rooms, ask your moderator to invite you or check back soon.'}{' '}
              In the meantime, explore the{' '}
              <Link className="font-semibold text-primary underline" href="/demo-room">
                Demo Room
              </Link>{' '}
              to see how things work.
            </>
          }
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/demo-room">Visit demo room</Link>
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
