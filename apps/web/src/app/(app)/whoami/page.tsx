import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require';

export default async function WhoAmIPage() {
  const supabase = supabaseServer();
  const user = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('user_id', user.id)
    .single();

  const { data: reporter } = await supabase
    .from('reporters')
    .select('credential_status')
    .eq('user_id', user.id)
    .single();

  const suggestedNext =
    profile?.role === 'moderator' || profile?.role === 'staff' || profile?.role === 'admin_service'
      ? '/moderator'
      : '/reporter';

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="whoami-title">Who am I?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        <div>
          <div className="text-slate-500">User</div>
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(
              {
                id: user.id,
                email: user.email,
                app_metadata: user.app_metadata,
                user_metadata: user.user_metadata,
              },
              null,
              2,
            )}
          </pre>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-slate-500">Role</div>
            <div className="font-semibold text-slate-900" data-testid="whoami-role">
              {profile?.role ?? 'unknown'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-slate-500">Reporter credential</div>
            <div className="font-semibold text-slate-900" data-testid="whoami-credential">
              {reporter?.credential_status ?? 'n/a'}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          <p>
            Reminder: the UI may suggest a dashboard, but the database still enforces access. If
            your role changes, refresh and re-check here.
          </p>
        </div>

        <div className="flex gap-4 text-sm">
          <a className="underline text-slate-900" href={suggestedNext}>
            Go to dashboard
          </a>
          <form action="/logout" method="post">
            <button className="font-medium text-slate-900 underline">Sign out</button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
