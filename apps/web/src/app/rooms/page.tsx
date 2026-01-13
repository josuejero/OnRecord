import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle } from '@/components/ui/alert';
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
      <Card>
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
          <p>
            Your reporter credential is{' '}
            <span className="font-semibold">{reporter?.credential_status ?? 'pending'}</span>.
            Until it is approved, room access is denied by the database.
          </p>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="error">
          <AlertTitle>Unable to load rooms</AlertTitle>
          <p>{error.message}</p>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(rooms as RoomRow[] | null)?.map((room) => {
          const figSlug = room.public_figures?.slug ?? 'unknown';
          return (
            <Card key={room.id} className="hover:shadow-sm transition">
              <CardHeader>
                <CardTitle className="text-base">{room.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <div className="text-slate-500">Public figure</div>
                <div className="font-semibold text-slate-900">
                  {room.public_figures?.name ?? 'Unknown'}
                </div>

                <Link
                  className="inline-flex items-center text-slate-900 underline"
                  href={`/rooms/${encodeURIComponent(figSlug)}/${encodeURIComponent(room.slug)}`}
                >
                  Open room
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!rooms?.length && !error && !reporterPending ? (
        <EmptyState
          icon={<MapPin className="h-6 w-6 text-slate-400" aria-hidden />}
          title="No rooms found"
          description="Rooms appear once a moderator creates them. Check back later or contact support."
        />
      ) : null}
    </div>
  );
}
