import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require';
import {
  createScheduledSession,
  endSession,
  publishRecap,
  startSession,
  unpublishRecap,
} from './actions';
import { QuestionQueueClient } from './QuestionQueueClient';
import { AssetUploadPanel } from './AssetUploadPanel';
import { RecapPanel } from './RecapPanel';
import { TranscriptPanel } from './TranscriptPanel';
import { getFeatureFlags } from '@/lib/config/features';
import { Recap, RecapSchema } from '@onrecord/shared';

type SessionRow = {
  id: string;
  status: 'scheduled' | 'live' | 'ended';
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type RoomRecapRow = {
  id: string;
  prompt_version: string;
  provider: string;
  model_id: string;
  include_in_export: boolean;
  created_at: string;
  recap: Recap;
};

function fmt(ts: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ figureSlug: string; roomSlug: string }>;
}) {
  const { figureSlug, roomSlug } = await params;
  const { user, role } = await requireRole(['reporter', 'moderator', 'staff', 'admin_service']);
  const supabase = supabaseServer();
  const featureFlags = getFeatureFlags();

  const { data: pf, error: pfErr } = await supabase
    .from('public_figures')
    .select('id, slug, name')
    .eq('slug', figureSlug)
    .single();

  if (pfErr || !pf) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room not found</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Unable to resolve public figure.
        </CardContent>
      </Card>
    );
  }

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, slug, title')
    .eq('public_figure_id', pf.id)
    .eq('slug', roomSlug)
    .single();

  if (roomErr || !room) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room not found</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">Unable to resolve room.</CardContent>
      </Card>
    );
  }

  const { data: sessions, error: sessionsErr } = await supabase
    .from('sessions')
    .select('id, status, starts_at, ends_at, created_at')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false });

  const list = (sessions as SessionRow[] | null) ?? [];
  const live = list.find((s) => s.status === 'live') ?? null;
  const activeSessionId = live?.id ?? null;
  const latest = live ?? list[0] ?? null;
  const publicRecapSlug = latest ? `${pf.slug}-${roomSlug}-${latest.id.slice(0, 8)}` : null;

  const canModerate = role === 'moderator' || role === 'staff' || role === 'admin_service';
  const canCreate = role === 'staff' || role === 'admin_service';

  const revalidate = `/rooms/${encodeURIComponent(figureSlug)}/${encodeURIComponent(roomSlug)}`;

  const recaps: RoomRecapRow[] = [];
  let recapError: string | null = null;
  if (latest) {
    const { data: rawRecaps, error: rawRecapsErr } = await supabase
      .from('transcript_ai_outputs')
      .select('id, prompt_version, provider, model_id, output, include_in_export, created_at')
      .eq('session_id', latest.id)
      .order('created_at', { ascending: false });
    if (rawRecapsErr) {
      recapError = rawRecapsErr.message;
    }
    if (rawRecaps?.length) {
      for (const row of rawRecaps) {
        const parsed = RecapSchema.safeParse(row.output);
        if (!parsed.success) continue;
        recaps.push({
          id: row.id,
          prompt_version: row.prompt_version,
          provider: row.provider,
          model_id: row.model_id,
          include_in_export: row.include_in_export,
          created_at: row.created_at,
          recap: parsed.data,
        });
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle data-testid="room-title">{room.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div>
            Public figure: <span className="font-semibold text-slate-900">{pf.name}</span>
          </div>
          <div>
            Signed in as: <span className="font-semibold text-slate-900">{user.email}</span>
          </div>
          <div>
            Role: <span className="font-semibold text-slate-900">{role}</span>
          </div>
        </CardContent>
      </Card>

      {sessionsErr ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {sessionsErr.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base" data-testid="session-summary-title">
            Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {latest ? (
            <>
              <div className="flex items-center gap-2">
                <Badge data-testid="session-status-badge">{latest.status}</Badge>
                <span className="text-slate-500">(latest)</span>
              </div>
              <div>
                Starts:{' '}
                <span className="font-semibold text-slate-900">{fmt(latest.starts_at)}</span>
              </div>
              <div>
                Ends: <span className="font-semibold text-slate-900">{fmt(latest.ends_at)}</span>
              </div>

              {canModerate ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {latest.status === 'scheduled' ? (
                    <form action={startSession}>
                      <input type="hidden" name="session_id" value={latest.id} />
                      <input type="hidden" name="revalidate" value={revalidate} />
                      <Button data-testid="session-start" type="submit">
                        Start session
                      </Button>
                    </form>
                  ) : null}

                  {latest.status === 'live' ? (
                    <form action={endSession}>
                      <input type="hidden" name="session_id" value={latest.id} />
                      <input type="hidden" name="revalidate" value={revalidate} />
                      <Button data-testid="session-end" type="submit" variant="secondary">
                        End session
                      </Button>
                    </form>
                  ) : null}

                  {canCreate ? (
                    <form action={createScheduledSession}>
                      <input type="hidden" name="room_id" value={room.id} />
                      <input type="hidden" name="revalidate" value={revalidate} />
                      <Button data-testid="session-create" type="submit" variant="outline">
                        Create scheduled session
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : (
                <div className="text-slate-500">
                  Moderation controls are available to moderators and staff.
                </div>
              )}

              {canModerate && publicRecapSlug ? (
                <div className="pt-3 space-y-2">
                  <form action={publishRecap} className="flex flex-wrap gap-2">
                    <input type="hidden" name="session_id" value={latest.id} />
                    <input type="hidden" name="figure_slug" value={pf.slug} />
                    <input type="hidden" name="room_slug" value={roomSlug} />
                    <input type="hidden" name="public_figure_name" value={pf.name} />
                    <input type="hidden" name="room_title" value={room.title} />
                    <input type="hidden" name="revalidate" value={revalidate} />
                    <input
                      type="hidden"
                      id="public-recap-summary"
                      name="summary"
                      value=""
                      aria-hidden="true"
                    />
                    <Button type="submit" variant="outline" size="sm">
                      Publish recap
                    </Button>
                  </form>

                  <div className="text-xs text-slate-500">
                    Public URL:
                    <div className="font-mono">/recaps/{publicRecapSlug}</div>
                    <div className="text-slate-400">Unpublished recaps return 404.</div>
                  </div>

                  <form action={unpublishRecap} className="flex flex-wrap gap-2">
                    <input type="hidden" name="session_id" value={latest.id} />
                    <input type="hidden" name="slug" value={publicRecapSlug} />
                    <input type="hidden" name="revalidate" value={revalidate} />
                    <Button type="submit" variant="ghost" size="sm">
                      Unpublish recap
                    </Button>
                  </form>

                  <div data-testid="session-id" className="hidden">
                    {latest.id}
                  </div>
                </div>
              ) : null}

              {/* Optional: surface constraint errors in Phase 2 by adding error boundaries or redirect with toast */}
            </>
          ) : (
            <div className="text-slate-500">No sessions found for this room.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          {live ? (
            <QuestionQueueClient
              sessionId={live.id}
              activeSessionId={activeSessionId}
              role={role}
            />
          ) : (
            <div className="text-slate-500">
              No live session. Questions open when the session is live.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          {list.length ? (
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Badge>{s.status}</Badge>
                    <span className="text-slate-500">created {fmt(s.created_at)}</span>
                  </div>
                  <div>
                    Starts: <span className="font-semibold text-slate-900">{fmt(s.starts_at)}</span>
                  </div>
                  <div>
                    Ends: <span className="font-semibold text-slate-900">{fmt(s.ends_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-500">No session history yet.</div>
          )}
        </CardContent>
      </Card>

      {canModerate && latest ? (
        <div className="space-y-4">
          <AssetUploadPanel sessionId={latest.id} revalidatePath={revalidate} />
          {recapError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {recapError}
            </div>
          ) : null}
          <RecapPanel
            key={`${latest.id}-${recaps[0]?.id ?? 'none'}`}
            sessionId={latest.id}
            revalidatePath={revalidate}
            recaps={recaps}
            featureFlags={featureFlags}
          />
          <TranscriptPanel sessionId={latest.id} revalidate={revalidate} />
        </div>
      ) : null}
    </div>
  );
}
