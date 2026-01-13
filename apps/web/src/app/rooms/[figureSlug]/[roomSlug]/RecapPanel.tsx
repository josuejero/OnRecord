'use client';

import { useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

type RecapPanelProps = {
  sessionId: string;
  revalidatePath: string;
  recaps: RecapRow[];
  featureFlags: FeatureFlags;
};

export function RecapPanel({ sessionId, revalidatePath, recaps, featureFlags }: RecapPanelProps) {
  const sortedRecaps = useMemo(() => [...recaps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [recaps]);
  const defaultRecapId = sortedRecaps[0]?.id ?? null;
  const defaultPromptVersion = sortedRecaps[0]?.prompt_version ?? 'recap-v1';

  const [selectedRecapId, setSelectedRecapId] = useState<string | null>(defaultRecapId);
  const [promptVersion, setPromptVersion] = useState(defaultPromptVersion);

  const selectedRecap = sortedRecaps.find((recap) => recap.id === selectedRecapId) ?? sortedRecaps[0] ?? null;
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
          setError(typeof err?.message === 'string' ? err.message : 'Unable to update export attachment.');
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">AI recap draft</CardTitle>
          <Badge variant="outline">Draft</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Provider: {featureFlags.aiRecapProvider} · {selectedRecap ? 'Structured output saved as draft' : 'Run generation to create a recap'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!featureFlags.aiRecapEnabled ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            AI recaps are disabled. Toggle NEXT_PUBLIC_AI_RECAP_ENABLED to enable generation.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRecaps.length ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Session recap versions</div>
                <select
                  value={selectedRecapId ?? ''}
                  onChange={(event) => {
                    setSelectedRecapId(event.target.value);
                    setPublicCopyMessage(null);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm text-slate-800"
                >
                  {sortedRecaps.map((recap) => (
                    <option key={recap.id} value={recap.id}>
                      {recap.prompt_version} · {new Date(recap.created_at).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span>Prompt version</span>
                <Button size="sm" variant="outline" type="button" onClick={() => setPromptVersion(`recap-${Math.random().toString(36).slice(2, 6)}`)}>
                  New version
                </Button>
              </div>
              <Input value={promptVersion} onChange={(event) => setPromptVersion(event.target.value)} placeholder="recap-v1" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleRegenerate}
                disabled={isBusy || !featureFlags.aiRecapEnabled}
                variant="default"
              >
                {pendingAction === 'regenerate' ? 'Regenerating…' : 'Regenerate recap'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={!selectedRecap}>
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
                  Copy draft to public recap
                </Button>
              ) : null}
            </div>

            {publicCopyMessage ? (
              <p className="text-xs text-muted-foreground">{publicCopyMessage}</p>
            ) : null}
          </div>
        )}

        {selectedRecap ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">{selectedRecap.recap.summary}</p>
              {selectedRecap.recap.verification_notes ? (
                <p className="text-xs text-muted-foreground">{selectedRecap.recap.verification_notes}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Key concerns</p>
              <div className="space-y-2">
                {selectedRecap.recap.key_concerns.map((concern, idx) => (
                  <div key={`${concern.title}-${idx}`} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{concern.title}</p>
                    <p className="mt-1 text-slate-900">{concern.detail}</p>
                    {concern.evidence_span ? (
                      <p className="text-xs text-slate-500">
                        Evidence span: offset {concern.evidence_span.start_offset}–{concern.evidence_span.end_offset}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Follow-up questions</p>
              <ul className="list-disc pl-5 text-sm text-slate-800">
                {selectedRecap.recap.follow_up_questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <strong>Safety notes:</strong> {selectedRecap.recap.safety_notes}
            </div>

            <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
              <div>Provider: {selectedRecap.recap.model_info.provider}</div>
              <div>Model: {selectedRecap.recap.model_info.model_id}</div>
              <div>Prompt version: {selectedRecap.recap.model_info.prompt_version}</div>
              <div>Hardware: {selectedRecap.recap.model_info.hardware ?? 'cpu'}</div>
              <div>Created: {new Date(selectedRecap.created_at).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
            No recap draft yet. Click “Regenerate recap” to create a structured summary.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildClipboardText(recap: Recap) {
  const concerns = recap.key_concerns
    .map((concern) => `- ${concern.title}: ${concern.detail}`)
    .join('\n');
  const followUps = recap.follow_up_questions.map((question) => `- ${question}`).join('\n');
  return `Summary:\n${recap.summary}\n\nKey concerns:\n${concerns}\n\nFollow-up questions:\n${followUps}\n\nSafety notes:\n${recap.safety_notes}`;
}
