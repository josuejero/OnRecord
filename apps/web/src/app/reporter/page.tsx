import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/require';

export default async function ReporterDashboard() {
  const { user, role } = await requireRole(['reporter']);
  const disableRoomsPrefetch = process.env.NEXT_PUBLIC_DISABLE_ROOM_PREFETCH === 'true';
  const roomsLinkPrefetch = disableRoomsPrefetch ? false : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="reporter-title">Reporter Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <div>
          Signed in as: <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
        <div>
          Role: <span className="font-semibold text-slate-900">{role}</span>
        </div>
        <p className="text-slate-500">
          Phase 2 adds room/session navigation; Phase 3 adds question submission.
        </p>
        <Link
          className="inline-flex text-slate-900 underline"
          href="/rooms"
          prefetch={roomsLinkPrefetch}
        >
          Browse rooms
        </Link>
      </CardContent>
    </Card>
  );
}
