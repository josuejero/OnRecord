import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';

export default async function DebugPage() {
  const supabase = supabaseServer();
  const { data, error } = await supabase.from('demo_ping').select('id, inserted_at').limit(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="debug-title">Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <div>
          <span className="font-semibold text-slate-900">DB reachable:</span>{' '}
          <span data-testid="db-status">{error ? 'NO' : 'YES'}</span>
        </div>
        {error ? (
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-red-600">
            {JSON.stringify(error, null, 2)}
          </pre>
        ) : (
          <pre
            data-testid="db-ping-row"
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
          >
            {JSON.stringify(data?.[0] ?? null, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
