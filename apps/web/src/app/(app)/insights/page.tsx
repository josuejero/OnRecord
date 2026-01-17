import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth/require';
import { supabaseServer } from '@/lib/supabase/server';
import { BarChart } from 'lucide-react';
import Link from 'next/link';
import { EmptyPanel, Panel, PanelHeader, Page, PageHeader } from '@/components/layout';
import { InsightsTableClient } from './InsightsTableClient';
import { InsightsSessionRow } from './types';

export default async function InsightsPage() {
  await requireRole(['moderator', 'staff', 'admin_service']);
  const disableRoomsPrefetch = process.env.NEXT_PUBLIC_DISABLE_ROOM_PREFETCH === 'true';
  const roomsLinkPrefetch = disableRoomsPrefetch ? false : undefined;

  const supabase = supabaseServer();
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select(
      `id, status, starts_at, ends_at,
       rooms ( title, slug, public_figures ( name, slug ) ),
       session_insights ( computed_at, questions_total, questions_answered, questions_rejected, rejection_rate, avg_time_to_answer_seconds, transcript_word_count, top_terms )`,
    )
    .order('starts_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const sessionRows = (sessions ?? []) as InsightsSessionRow[];
  const hasInsights = sessionRows.length > 0;

  const headerDescription = (
    <>
      Session-level metrics (cached in <code className="font-mono">session_insights</code>). Run
      &ldquo;Cleanup + refresh insights&rdquo; from a room to update.
    </>
  );

  return (
    <Page className="space-y-6">
      <PageHeader
        title="Insights"
        description={headerDescription}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href="/rooms" prefetch={roomsLinkPrefetch}>
              Rooms
            </Link>
          </Button>
        }
      />

      {hasInsights ? (
        <Panel header={<PanelHeader title="Session insights" description="Latest 50 sessions" />}>
          <InsightsTableClient sessions={sessionRows} roomLinkPrefetch={roomsLinkPrefetch} />
        </Panel>
      ) : (
        <EmptyPanel
          icon={<BarChart className="h-6 w-6 text-slate-400" aria-hidden />}
          title="No insights yet"
          description={
            <>
              Session metrics are populated when a session caches insights. Run &ldquo;Cleanup +
              refresh insights&rdquo; from an active room session to seed this view.
            </>
          }
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/rooms" prefetch={roomsLinkPrefetch}>
                Visit rooms
              </Link>
            </Button>
          }
        />
      )}

      <div className="text-xs text-muted-foreground">
        Tip: If a row shows dashes, open that room session and run &ldquo;Cleanup + refresh
        insights&rdquo; to populate the cache.
      </div>
    </Page>
  );
}
