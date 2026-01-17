'use client';

import { type ReactNode, useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FeatureFlags } from '@/lib/config/features';
import { generateRecap, setRecapExportAttachment } from './actions';
import type { Recap } from '@onrecord/shared';

type RecapRow = {
  id: string;
  prompt_version: string;
  provider: string;
  model_id: string;
  include_in_export: boolean;
  created_at: string;
  recap: Recap;
};

const PUBLIC_RECAP_SUMMARY_ID = 'public-recap-summary';

export type RecapPanelProps = {
  sessionId: string;
  revalidatePath: string;
  recaps: RecapRow[];
  featureFlags: FeatureFlags;
};

export function RecapPanel({ sessionId, revalidatePath, recaps, featureFlags }: RecapPanelProps) {
  const sortedRecaps = useMemo(
    () =>
      [...recaps].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [recaps],
  );
  const defaultRecapId = sortedRecaps[0]?.id ?? null;
  const defaultPromptVersion = sortedRecaps[0]?.prompt_version ?? 'recap-v1';

  const [selectedRecapId, setSelectedRecapId] = useState<string | null>(defaultRecapId);
  const [promptVersion, setPromptVersion] = useState(defaultPromptVersion);
  const selectedRecap =
    sortedRecaps.find((recap) => recap.id === selectedRecapId) ?? sortedRecaps[0] ?? null;
  const [pendingAction, setPendingAction] = useState<'regenerate' | 'attach' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publicCopyMessage, setPublicCopyMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleRegenerate = () => {
    setError(null);
    const version = promptVersion.trim() || 'recap-v1';
    const formData = new FormData();
    formData.set('session_id', sessionId);
    formData.set('prompt_version', version);
    formData.set('provider', featureFlags.aiRecapProvider);
    formData.set('revalidate', revalidatePath);
    formData.set('include_in_export', 'false');

    startTransition(() => {
      setPendingAction('regenerate');
      return generateRecap(formData)
        .catch((err) => {
          setError(typeof err?.message === 'string' ? err.message : 'Unable to generate recap.');
        })
        .finally(() => setPendingAction(null));
    });
  };

  const handleAttach = (attach: boolean) => {
    if (!selectedRecap) return;
    setError(null);
    const formData = new FormData();
    formData.set('recap_id', selectedRecap.id);
    formData.set('attach', attach ? 'true' : 'false');
    formData.set('revalidate', revalidatePath);

    startTransition(() => {
      setPendingAction('attach');
      return setRecapExportAttachment(formData)
        .catch((err) => {
          setError(
            typeof err?.message === 'string' ? err.message : 'Unable to update export attachment.',
          );
        })
        .finally(() => setPendingAction(null));
    });
  };

  const handleCopy = async () => {
    if (!selectedRecap) return;
    const text = buildClipboardText(selectedRecap.recap);
    if (!navigator?.clipboard) {
      setError('Clipboard API not available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  const handleCopyToPublicRecap = () => {
    if (!selectedRecap) return;
    const target = document.getElementById(PUBLIC_RECAP_SUMMARY_ID) as HTMLInputElement | null;
    if (!target) {
      setError('Public recap form not available.');
      return;
    }
    target.value = selectedRecap.recap.summary;
    setPublicCopyMessage('Draft summary copied to the public recap form.');
  };

  const isBusy = Boolean(pendingAction);
  const aiDisabled = !featureFlags.aiRecapEnabled;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">AI recap draft</CardTitle>
          <Badge variant="outline">Draft</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Provider: {featureFlags.aiRecapProvider} ·{' '}
          {selectedRecap ? 'Structured output saved as a draft' : 'Run generation to create a recap'}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {aiDisabled ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            AI recaps are disabled. Toggle NEXT_PUBLIC_AI_RECAP_ENABLED to enable generation.
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {sortedRecaps.length ? (
              <div className="space-y-2 text-xs text-slate-500">
                <p className="uppercase tracking-[0.3em] text-slate-400">Recap versions</p>
                <select
                  value={selectedRecapId ?? ''}
                  onChange={(event) => {
                    setSelectedRecapId(event.target.value);
                    setPublicCopyMessage(null);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-800"
                >
                  {sortedRecaps.map((recap) => (
                    <option key={recap.id} value={recap.id}>
                      {recap.prompt_version} · {new Date(recap.created_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                  <span>Prompt version</span>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setPromptVersion(`recap-${Math.random().toString(36).slice(2, 6)}`)
                    }
                  >
                    New version
                  </Button>
                </div>
                <Input
                  value={promptVersion}
                  onChange={(event) => setPromptVersion(event.target.value)}
                  placeholder="recap-v1"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleRegenerate}
                disabled={isBusy || aiDisabled}
                variant="default"
              >
                {pendingAction === 'regenerate' ? 'Regenerating…' : 'Regenerate recap'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!selectedRecap}
              >
                Copy to clipboard
              </Button>
              {selectedRecap ? (
                <Button
                  type="button"
                  variant={selectedRecap.include_in_export ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleAttach(!selectedRecap.include_in_export)}
                  disabled={pendingAction === 'attach'}
                >
                  {selectedRecap.include_in_export ? 'Attached to export' : 'Attach to export'}
                </Button>
              ) : null}
              {selectedRecap ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleCopyToPublicRecap}>
                  Copy to public recap
                </Button>
              ) : null}
            </div>
            {publicCopyMessage ? (
              <p className="text-xs text-emerald-700">{publicCopyMessage}</p>
            ) : null}
          </div>
        )}

        {selectedRecap ? (
          <div className="space-y-4">
            <QASection number="1" title="Summary">
              <p className="text-lg font-semibold text-slate-900">{selectedRecap.recap.summary}</p>
            </QASection>

            <div className="space-y-3">
              {selectedRecap.recap.key_concerns.map((concern, idx) => (
                <QASection
                  key={`${concern.title}-${idx}`}
                  number={`${idx + 2}`}
                  title={concern.title}
                  metadata={
                    concern.label
                      ? `${concern.label.label_type.replace(/_/g, ' ')} · ${
                          concern.label.label_value ?? 'flagged'
                        }`
                      : undefined
                  }
                >
                  <p className="text-slate-900">{concern.detail}</p>
                </QASection>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <QASection number="F" title="Follow-up questions" quiet>
                {selectedRecap.recap.follow_up_questions.length ? (
                  <ul className="space-y-1 text-[0.85rem] text-slate-800">
                    {selectedRecap.recap.follow_up_questions.map((question, idx) => (
                      <li key={question} className="flex items-start gap-2">
                        <span className="font-semibold text-slate-900">{idx + 1}.</span>
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-700">
                    Verify the transcript for any additional follow-up questions.
                  </p>
                )}
              </QASection>

              <QASection number="S" title="Safety notes" quiet>
                <p className="text-slate-900">{selectedRecap.recap.safety_notes}</p>
                {selectedRecap.recap.verification_notes ? (
                  <p className="text-xs text-slate-500">
                    {selectedRecap.recap.verification_notes}
                  </p>
                ) : null}
              </QASection>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2">
                <div>Provider: {selectedRecap.recap.model_info.provider}</div>
                <div>Model: {selectedRecap.recap.model_info.model_id}</div>
                <div>Prompt version: {selectedRecap.recap.model_info.prompt_version}</div>
                <div>Hardware: {selectedRecap.recap.model_info.hardware ?? 'cpu'}</div>
                <div>Executed: {new Date(selectedRecap.recap.model_info.executed_at).toLocaleString()}</div>
                <div>Generated: {new Date(selectedRecap.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            No recap draft yet. Click “Regenerate recap” to create a structured summary.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type QASectionProps = {
  number: string | number;
  title: string;
  quiet?: boolean;
  metadata?: string;
  children: ReactNode;
};

function QASection({ number, title, quiet, metadata, children }: QASectionProps) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border px-4 py-3',
        quiet ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white shadow-sm',
      )}
    >
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
        <span>Q{number}</span>
        <span className="text-slate-500">{title}</span>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm leading-relaxed text-slate-800">
        {children}
      </div>
      {metadata ? (
        <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">{metadata}</p>
      ) : null}
    </div>
  );
}

function buildClipboardText(recap: Recap) {
  const concerns = recap.key_concerns
    .map((concern) => `- ${concern.title}: ${concern.detail}`)
    .join('\n');
  const followUps = recap.follow_up_questions.map((question) => `- ${question}`).join('\n');
  return `Summary:\n${recap.summary}\n\nKey concerns:\n${concerns}\n\nFollow-up questions:\n${followUps}\n\nSafety notes:\n${recap.safety_notes}`;
}
