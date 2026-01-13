import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/require';

export default async function ModeratorDashboard() {
  const { user, role } = await requireRole(['moderator', 'staff', 'admin_service']);

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="moderator-title">Moderator Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <div>
          Signed in as: <span className="font-semibold text-slate-900">{user.email}</span>
        </div>
        <div>
          Role: <span className="font-semibold text-slate-900">{role}</span>
        </div>
        <p className="text-slate-500">
          Phase 2 adds session lifecycle controls; Phase 3 adds the realtime question queue.
        </p>
        <Link className="inline-flex text-slate-900 underline" href="/rooms">
          Browse rooms
        </Link>
      </CardContent>
    </Card>
  );
}
