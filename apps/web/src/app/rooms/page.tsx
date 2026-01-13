import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require';

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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your reporter credential is{' '}
          <span className="font-semibold">{reporter?.credential_status ?? 'pending'}</span>. Until it is approved,
          room access is denied by the database.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load rooms. {error.message}
        </div>
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
                <div className="font-semibold text-slate-900">{room.public_figures?.name ?? 'Unknown'}</div>

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
        <div className="text-sm text-slate-500">No rooms found.</div>
      ) : null}
    </div>
  );
}
