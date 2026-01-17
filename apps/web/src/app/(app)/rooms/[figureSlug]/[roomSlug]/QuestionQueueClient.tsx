'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, Check, Edit3, Target, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Role = 'reporter' | 'moderator' | 'staff' | 'admin_service';

type QuestionStatus = 'pending' | 'approved' | 'rejected' | 'needs_edit' | 'answered';

export type QuestionRow = {
  id: string;
  session_id: string;
  reporter_id: string;
  body: string;
  status: QuestionStatus;
  sort_rank: number;
  created_at: string;
  updated_at: string;
};

type AnswerRow = {
  id: string;
  question_id: string;
  session_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  active_question_id: string | null;
};

type ConnectionState = 'connecting' | 'connected' | 'disconnected';

const connectionStatusMeta: Record<ConnectionState, { label: string; dot: string; text: string }> =
  {
    connecting: {
      label: 'Connecting to live queue…',
      dot: 'bg-amber-400',
      text: 'text-amber-600',
    },
    connected: {
      label: 'Live queue connected',
      dot: 'bg-emerald-500',
      text: 'text-slate-600',
    },
    disconnected: {
      label: 'Connection lost, retrying…',
      dot: 'bg-red-500',
      text: 'text-red-600',
    },
  };

function stableSort(list: QuestionRow[]) {
  return [...list].sort((a, b) => {
    if (a.sort_rank !== b.sort_rank) return a.sort_rank - b.sort_rank;
    if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
    return a.id.localeCompare(b.id);
  });
}

function prettyError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('not_authenticated')) return 'Please sign in again.';
  if (m.includes('forbidden')) return 'You do not have permission to do that.';
  if (m.includes('invalid_status')) return 'That status change is not allowed.';
  if (m.includes('question_not_approved'))
    return 'Only approved questions can be made active or answered.';
  if (m.includes('empty_answer')) return 'Answer can’t be empty.';
  if (m.includes('invalid_state')) return 'That action is not allowed in the current state.';
  if (msg.includes('rate_limited_cooldown'))
    return 'Slow down: please wait a moment before submitting again.';
  if (msg.includes('rate_limited_per_minute'))
    return 'Too many questions: try again in about a minute.';
  if (m.includes('row-level security')) return 'Permission denied by database policy.';
  return msg;
}

function QueueRow({
  question,
  meta,
  actions,
  isActive,
}: {
  question: QuestionRow;
  meta?: string[];
  actions?: ReactNode;
  isActive?: boolean;
}) {
  return (
    <div
      className={cn(
        'group flex flex-col gap-2 rounded-2xl border bg-white px-4 py-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-300',
        isActive ? 'border-slate-900' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm text-slate-900">{question.body}</p>
          <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
            {meta?.map((item, idx) => (
              <span key={`${item}-${idx}`}>{item}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">{statusBadge(question.status)}</div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1">{actions}</div> : null}
      </div>
    </div>
  );
}

function IconActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 rounded-full p-0 text-slate-500 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-slate-100 hover:text-slate-700"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function formatRelativeAge(value?: string | null) {
  if (!value) return 'unknown age';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatReporterId(value: string) {
  return value.slice(0, 7);
}

function statusBadge(status: QuestionStatus) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">pending</Badge>;
    case 'approved':
      return <Badge>approved</Badge>;
    case 'needs_edit':
      return <Badge variant="outline">needs edit</Badge>;
    case 'answered':
      return <Badge variant="secondary">answered</Badge>;
    case 'rejected':
      return <Badge variant="destructive">rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function QuestionQueueClient({
  sessionId,
  activeSessionId,
  role,
}: {
  sessionId: string;
  activeSessionId: string | null;
  role: Role;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, AnswerRow>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const answersRef = useRef<Record<string, AnswerRow>>({});
  const activeQuestionIdRef = useRef<string | null>(null);

  // Reporter input
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Moderator answer draft
  const [answerDraft, setAnswerDraft] = useState('');
  const [answerSubmitting, setAnswerSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  const isModeratorLike = role === 'moderator' || role === 'staff' || role === 'admin_service';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadState = useCallback(async () => {
    if (!sessionId || loadingRef.current) return;
    loadingRef.current = true;
    setError(null);

    try {
      const qRes = await supabase
        .from('questions')
        .select('id, session_id, reporter_id, body, status, sort_rank, created_at, updated_at')
        .eq('session_id', sessionId)
        .order('sort_rank', { ascending: true })
        .order('created_at', { ascending: true });

      if (!isMountedRef.current) return;
      if (qRes.error) {
        setError(prettyError(qRes.error.message));
        return;
      }
      setQuestions(stableSort((qRes.data ?? []) as QuestionRow[]));

      const aRes = await supabase
        .from('answers')
        .select('id, question_id, session_id, body, created_by, created_at, updated_at')
        .eq('session_id', sessionId);

      if (!isMountedRef.current) return;
      if (aRes.error) {
        setError(prettyError(aRes.error.message));
        return;
      }
      const nextAnswers: Record<string, AnswerRow> = {};
      for (const a of (aRes.data ?? []) as AnswerRow[]) nextAnswers[a.question_id] = a;
      setAnswersByQuestion(nextAnswers);

      const sRes = await supabase
        .from('sessions')
        .select('id, active_question_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!isMountedRef.current) return;
      if (sRes.error) {
        setError(prettyError(sRes.error.message));
        return;
      }
      const session = (sRes.data as SessionRow | null) ?? null;
      const nextActive = session?.active_question_id ?? null;
      setActiveQuestionId(nextActive);
      setAnswerDraft(nextActive ? (nextAnswers[nextActive]?.body ?? '') : '');
    } finally {
      loadingRef.current = false;
    }
  }, [sessionId, supabase]);

  useEffect(() => {
    answersRef.current = answersByQuestion;
  }, [answersByQuestion]);

  useEffect(() => {
    activeQuestionIdRef.current = activeQuestionId;
  }, [activeQuestionId]);

  const orderedQuestions = useMemo(() => stableSort(questions), [questions]);

  const moderationQueue = useMemo(
    () => orderedQuestions.filter((q) => q.status === 'pending' || q.status === 'needs_edit'),
    [orderedQuestions],
  );

  const approvedQueue = useMemo(
    () => orderedQuestions.filter((q) => q.status === 'approved'),
    [orderedQuestions],
  );

  const answeredQueue = useMemo(
    () => orderedQuestions.filter((q) => q.status === 'answered'),
    [orderedQuestions],
  );

  const activeQuestion = useMemo(
    () =>
      activeQuestionId ? (orderedQuestions.find((q) => q.id === activeQuestionId) ?? null) : null,
    [activeQuestionId, orderedQuestions],
  );

  const statusMeta = connectionStatusMeta[connectionState];

  useEffect(() => {
    if (!sessionId) return;

    setConnectionState('connecting');
    void loadState();

    const questionsChannel = supabase
      .channel(`questions:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setQuestions((prev) => {
            const next = [...prev];

            if (payload.eventType === 'INSERT') {
              const row = payload.new as unknown as QuestionRow;
              if (!next.some((q) => q.id === row.id)) next.push(row);
              return stableSort(next);
            }

            if (payload.eventType === 'UPDATE') {
              const row = payload.new as unknown as QuestionRow;
              const idx = next.findIndex((q) => q.id === row.id);
              if (idx >= 0) next[idx] = row;
              else next.push(row);
              return stableSort(next);
            }

            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as unknown as { id: string };
              return next.filter((q) => q.id !== oldRow.id);
            }

            return prev;
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setConnectionState('disconnected');
        }
      });

    const answersChannel = supabase
      .channel(`answers:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as unknown as AnswerRow;
            setAnswersByQuestion((prev) => {
              const next = { ...prev, [row.question_id]: row };
              if (activeQuestionIdRef.current === row.question_id) {
                setAnswerDraft(row.body);
              }
              return next;
            });
          }
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as unknown as { question_id: string };
            setAnswersByQuestion((prev) => {
              const next = { ...prev };
              delete next[oldRow.question_id];
              if (activeQuestionIdRef.current === oldRow.question_id) {
                setAnswerDraft('');
              }
              return next;
            });
          }
        },
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`sessions:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const row = payload.new as SessionRow | null;
          const nextActive = row?.active_question_id ?? null;
          setActiveQuestionId(nextActive);
          setAnswerDraft(nextActive ? (answersRef.current[nextActive]?.body ?? '') : '');
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(questionsChannel);
      supabase.removeChannel(answersChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [supabase, sessionId, loadState]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = window.setInterval(() => {
      void loadState();
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, loadState]);

  async function submitQuestion() {
    if (!activeSessionId) return;
    const trimmed = body.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    // optimistic
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    const optimistic: QuestionRow = {
      id: optimisticId,
      session_id: sessionId,
      reporter_id: 'optimistic',
      body: trimmed,
      status: 'pending',
      sort_rank: Number.MAX_SAFE_INTEGER,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setQuestions((prev) => stableSort([...prev, optimistic]));

    const { error } = await supabase
      .from('questions')
      .insert({ session_id: sessionId, body: trimmed })
      .select('id, session_id, reporter_id, body, status, sort_rank, created_at, updated_at')
      .single();

    setSubmitting(false);

    if (error) {
      // remove optimistic row
      setQuestions((prev) => prev.filter((q) => q.id !== optimisticId));
      setError(prettyError(error.message));
      return;
    }

    setBody('');
  }

  async function setStatus(questionId: string, status: 'approved' | 'rejected' | 'needs_edit') {
    setError(null);
    const { error } = await supabase.rpc('set_question_status', {
      p_question_id: questionId,
      p_status: status,
      p_note: null,
    });
    if (error) {
      const message = prettyError(error.message);
      setError(message);
      toast.error(message);
      return;
    }

    const label =
      status === 'approved'
        ? 'Question approved'
        : status === 'rejected'
          ? 'Question rejected'
          : 'Question sent back for edits';
    toast.success(label);
  }

  async function moveInQueue(questionId: string, direction: 'up' | 'down') {
    setError(null);

    // reorder only moderationQueue (pending + needs_edit)
    const queue = [...moderationQueue];
    const idx = queue.findIndex((q) => q.id === questionId);
    if (idx < 0) return;

    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= queue.length) return;

    const next = [...queue];
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;

    // Update UI optimistically (sort_rank will be fixed by realtime update)
    const nextIds = next.map((q) => q.id);

    const { error } = await supabase.rpc('reorder_questions', {
      p_session_id: sessionId,
      p_question_ids: nextIds,
    });

    if (error) setError(prettyError(error.message));
  }

  async function setActive(questionId: string) {
    setError(null);
    const { error } = await supabase.rpc('set_active_question', {
      p_session_id: sessionId,
      p_question_id: questionId,
    });
    if (error) setError(prettyError(error.message));
  }

  async function clearActive() {
    setError(null);
    const { error } = await supabase.rpc('clear_active_question', { p_session_id: sessionId });
    if (error) setError(prettyError(error.message));
  }

  async function postAnswer() {
    if (!activeQuestionId) return;
    const trimmed = answerDraft.trim();
    if (!trimmed) return;

    setAnswerSubmitting(true);
    setError(null);

    const { error } = await supabase.rpc('post_answer', {
      p_question_id: activeQuestionId,
      p_body: trimmed,
    });

    setAnswerSubmitting(false);

    if (error) {
      setError(prettyError(error.message));
      return;
    }

    // After posting, the DB sets question => answered and clears active.
  }

  async function resubmitNeedsEdit(questionId: string, nextBody: string) {
    setError(null);
    const trimmed = nextBody.trim();
    if (!trimmed) return;

    const { error } = await supabase.rpc('resubmit_question', {
      p_question_id: questionId,
      p_body: trimmed,
    });

    if (error) setError(prettyError(error.message));
  }

  if (!sessionId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
        No active session.
      </div>
    );
  }

  const historyQueue = [
    ...answeredQueue,
    ...orderedQuestions.filter((q) => q.status === 'rejected'),
  ];

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="error" data-testid="question-queue-error">
          <AlertTitle>Question queue error</AlertTitle>
          <p>{error}</p>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', statusMeta.dot)} aria-hidden />
          <span className={cn('font-semibold text-slate-600', statusMeta.text)}>
            {statusMeta.label}
          </span>
        </div>
        <span>Realtime</span>
      </div>

      {role === 'reporter' ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Ask a question</div>
            <div className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
              Status updates are live
            </div>
          </div>
          {!activeSessionId ? (
            <p className="text-sm text-slate-600">
              No live session right now. You can’t submit questions until a moderator starts the
              session.
            </p>
          ) : null}
          <Textarea
            data-testid="question-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write your question…"
            disabled={!activeSessionId || submitting}
            className="border-slate-200 focus:border-slate-400"
          />
          <div className="flex justify-end">
            <LoadingButton
              data-testid="question-submit"
              loading={submitting}
              loadingText="Submitting question"
              onClick={submitQuestion}
              disabled={!activeSessionId || !body.trim()}
            >
              Submit
            </LoadingButton>
          </div>
        </div>
      ) : null}

      {isModeratorLike ? (
        <div className="space-y-5">
          <Tabs defaultValue="moderation">
            <TabsList className="rounded-full border border-slate-200 bg-white p-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-sm">
              <TabsTrigger value="moderation">Moderation ({moderationQueue.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedQueue.length})</TabsTrigger>
              <TabsTrigger value="history">History ({historyQueue.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="moderation">
              <div className="space-y-3">
                {moderationQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">No questions waiting for moderation.</p>
                ) : (
                  moderationQueue.map((q, idx) => (
                    <QueueRow
                      key={q.id}
                      question={q}
                      isActive={q.id === activeQuestionId}
                      meta={[
                        `Reporter ${formatReporterId(q.reporter_id)}`,
                        formatRelativeAge(q.created_at),
                      ]}
                      actions={
                        <>
                          <IconActionButton
                            icon={ArrowUp}
                            label="Move up"
                            onClick={() => moveInQueue(q.id, 'up')}
                            disabled={idx === 0}
                          />
                          <IconActionButton
                            icon={ArrowDown}
                            label="Move down"
                            onClick={() => moveInQueue(q.id, 'down')}
                            disabled={idx === moderationQueue.length - 1}
                          />
                          <IconActionButton
                            icon={Check}
                            label="Approve"
                            onClick={() => setStatus(q.id, 'approved')}
                          />
                          <IconActionButton
                            icon={Edit3}
                            label="Ask for edits"
                            onClick={() => setStatus(q.id, 'needs_edit')}
                          />
                          <IconActionButton
                            icon={X}
                            label="Reject"
                            onClick={() => setStatus(q.id, 'rejected')}
                          />
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved">
              <div className="space-y-3">
                {approvedQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">No approved questions yet.</p>
                ) : (
                  approvedQueue.map((q) => (
                    <QueueRow
                      key={q.id}
                      question={q}
                      isActive={q.id === activeQuestionId}
                      meta={[
                        `Reporter ${formatReporterId(q.reporter_id)}`,
                        formatRelativeAge(q.created_at),
                      ]}
                      actions={
                        <IconActionButton
                          icon={Target}
                          label="Set active"
                          onClick={() => setActive(q.id)}
                          disabled={activeQuestionId === q.id}
                        />
                      }
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-3">
                {historyQueue.length === 0 ? (
                  <p className="text-sm text-slate-500">No answered or rejected questions yet.</p>
                ) : (
                  historyQueue.map((q) => (
                    <QueueRow
                      key={q.id}
                      question={q}
                      meta={[
                        `Reporter ${formatReporterId(q.reporter_id)}`,
                        formatRelativeAge(q.created_at),
                      ]}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Active question</div>
                <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                  approved only
                </span>
              </div>

              {approvedQueue.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No approved questions yet.</p>
              ) : null}

              {activeQuestion ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Active</div>
                  <p className="mt-1 text-slate-900">{activeQuestion.body}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Set an active question to draft/publish an answer.
                </p>
              )}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearActive}
                  disabled={!activeQuestionId}
                >
                  Clear active
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Answer editor</div>
                <span className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                  publishes answers
                </span>
              </div>

              <div className="mt-3 space-y-3">
                <Textarea
                  data-testid="answer-body"
                  value={answerDraft}
                  onChange={(event) => setAnswerDraft(event.target.value)}
                  placeholder="Write the on-record answer…"
                  disabled={answerSubmitting}
                  className="border-slate-200 focus:border-slate-400"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Publishing marks the question as answered.</span>
                  <LoadingButton
                    data-testid="answer-submit"
                    loading={answerSubmitting}
                    loadingText="Publishing answer"
                    onClick={postAnswer}
                    disabled={!answerDraft.trim() || !activeQuestion}
                  >
                    Publish answer
                  </LoadingButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Questions</div>
          {activeQuestionId ? (
            <Badge variant="secondary">active question set</Badge>
          ) : (
            <Badge variant="outline">no active</Badge>
          )}
        </div>
        {orderedQuestions.length === 0 ? (
          <p className="text-sm text-slate-500">No questions yet.</p>
        ) : (
          <div className="space-y-3">
            {orderedQuestions.map((q) => {
              const answer = answersByQuestion[q.id];
              const isActive = activeQuestionId === q.id;
              return (
                <div
                  key={q.id}
                  className={cn(
                    'space-y-2 rounded-2xl border px-4 py-3',
                    isActive ? 'border-slate-900' : 'border-slate-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm text-slate-900">{q.body}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                        {formatRelativeAge(q.created_at)}
                        Reporter {formatReporterId(q.reporter_id)}
                      </div>
                      <div className="text-xs flex items-center gap-2">
                        {statusBadge(q.status)}
                        {isActive ? <Badge variant="secondary">active</Badge> : null}
                      </div>
                    </div>
                    {answer ? (
                      <Button variant="ghost" size="sm" disabled>
                        Answered
                      </Button>
                    ) : null}
                  </div>
                  {role === 'reporter' && q.status === 'needs_edit' ? (
                    <div className="space-y-2">
                      <Textarea
                        data-testid="needs-edit-body"
                        defaultValue={q.body}
                        placeholder="Revise your question…"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="needs-edit-submit"
                          onClick={(event) => {
                            const container = (event.currentTarget.closest('div')?.parentElement ??
                              null) as HTMLElement | null;
                            const textarea = container?.querySelector(
                              '[data-testid="needs-edit-body"]',
                            ) as HTMLTextAreaElement | null;
                            void resubmitNeedsEdit(q.id, textarea?.value ?? q.body);
                          }}
                        >
                          Resubmit
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {answer ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                        Answer
                      </div>
                      <p className="mt-1 text-slate-900">{answer.body}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
