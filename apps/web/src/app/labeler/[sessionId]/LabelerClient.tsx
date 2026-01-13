'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getEnv } from '@/lib/env';
import { createLabel, deleteLabel, updateLabel } from './actions';
import { LABEL_TYPES, type LabelRow, type LabelType } from './types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

type LabelerClientProps = {
  sessionId: string;
  transcriptId: string | null;
  transcriptText: string;
  labels: LabelRow[];
  recapSlug: string | null;
  revalidatePath: string;
};

type EditStateRecord = Record<string, { type: LabelType; value: string }>;

export function LabelerClient({
  sessionId,
  transcriptId,
  transcriptText,
  labels,
  recapSlug,
  revalidatePath,
}: LabelerClientProps) {
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [filter, setFilter] = useState<'all' | LabelType>('all');
  const [labelType, setLabelType] = useState<LabelType>(LABEL_TYPES[0]);
  const [labelValue, setLabelValue] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [edits, setEdits] = useState<EditStateRecord>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSelection({ start: 0, end: 0 });
  }, [transcriptText]);

  useEffect(() => {
    setEdits(
      Object.fromEntries(
        labels.map((label) => [
          label.id,
          { type: label.label_type, value: label.label_value ?? '' },
        ]),
      ),
    );
  }, [labels]);

  const updateSelection = () => {
    const el = textRef.current;
    if (!el) return;
    setSelection({
      start: el.selectionStart,
      end: el.selectionEnd,
    });
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const el = textRef.current;
      if (!el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      setSelection((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const selectionLength = Math.max(0, selection.end - selection.start);
  const selectionSnippet = transcriptText.slice(selection.start, selection.end);
  const selectionOverlaps = useMemo(() => {
    if (selectionLength === 0) return false;
    return labels.some(
      (label) => label.start_offset < selection.end && label.end_offset > selection.start,
    );
  }, [labels, selection, selectionLength]);

  const filteredLabels = useMemo(() => {
    if (filter === 'all') return labels;
    return labels.filter((label) => label.label_type === filter);
  }, [filter, labels]);

  const canCreate =
    !!transcriptId &&
    transcriptText.length > 0 &&
    selectionLength > 0 &&
    !selectionOverlaps &&
    pendingAction === null;

  const startAction = (actionKey: string, action: () => Promise<unknown>) => {
    setErrorMessage(null);
    startTransition(() => {
      setPendingAction(actionKey);
      action()
        .catch((error: unknown) => {
          setErrorMessage(resolveErrorMessage(error, 'Something went wrong.'));
        })
        .finally(() => {
          setPendingAction(null);
        });
    });
  };

  const handleCreate = () => {
    if (!canCreate || !transcriptId) return;
    const formData = new FormData();
    formData.set('session_id', sessionId);
    formData.set('transcript_id', transcriptId);
    formData.set('start_offset', String(selection.start));
    formData.set('end_offset', String(selection.end));
    formData.set('label_type', labelType);
    formData.set('label_value', labelValue);
    formData.set('revalidate', revalidatePath);

    startAction('create', () =>
      createLabel(formData).then(() => {
        setLabelValue('');
      }),
    );
  };

  const handleUpdate = (labelId: string) => {
    if (!edits[labelId] || pendingAction) return;
    const { type, value } = edits[labelId];
    const formData = new FormData();
    formData.set('label_id', labelId);
    formData.set('label_type', type);
    formData.set('label_value', value);
    formData.set('revalidate', revalidatePath);

    startAction(`update:${labelId}`, () => updateLabel(formData));
  };

  const handleDelete = (labelId: string) => {
    if (pendingAction) return;
    const formData = new FormData();
    formData.set('label_id', labelId);
    formData.set('revalidate', revalidatePath);

    startAction(`delete:${labelId}`, () => deleteLabel(formData));
  };

  const handleExport = async () => {
    if (!recapSlug || exporting) return;
    setExporting(true);
    setErrorMessage(null);
    try {
      const env = getEnv();
      const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/export-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          slug: recapSlug,
          format: 'jsonl',
          include: ['labels'],
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      downloadBlob(`onrecord-labels-${recapSlug}.jsonl`, blob);
    } catch (error: unknown) {
      setErrorMessage(resolveErrorMessage(error, 'Unable to export labels.'));
    } finally {
      setExporting(false);
    }
  };

  const labelSnippet = (label: LabelRow) => {
    const raw = transcriptText.slice(label.start_offset, label.end_offset).trim();
    if (raw.length <= 120) return raw;
    return raw.slice(0, 120) + '…';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            ref={textRef}
            value={transcriptText}
            readOnly
            spellCheck={false}
            rows={12}
            className="font-mono text-xs tracking-tight"
            data-testid="labeler-transcript"
            onMouseUp={updateSelection}
            onKeyUp={updateSelection}
            onSelect={updateSelection}
          />
          <div className="text-sm text-slate-500">
            <div data-testid="selection-offsets">
              Selection: {selection.start} – {selection.end} ({selectionLength} chars)
            </div>
            {selectionSnippet ? (
              <div className="mt-1">
                <span className="font-semibold text-slate-700">Snippet:</span>{' '}
                <span className="text-slate-900">{selectionSnippet}</span>
              </div>
            ) : null}
            <div className="text-xs text-slate-400">
              Transcript length: {transcriptText.length} characters.
            </div>
          </div>
          {selectionOverlaps ? (
            <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Selection overlaps an existing label.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create label</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 text-xs text-muted-foreground">
              <label
                className="text-xs uppercase tracking-wide text-slate-500"
                htmlFor="label-type-field"
              >
                Label type
              </label>
              <select
                id="label-type-field"
                value={labelType}
                onChange={(event) => setLabelType(event.target.value as LabelType)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {LABEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <label
                className="text-xs uppercase tracking-wide text-slate-500"
                htmlFor="label-value-field"
              >
                Label value (optional)
              </label>
              <Input
                id="label-value-field"
                value={labelValue}
                onChange={(event) => setLabelValue(event.target.value)}
                placeholder="e.g. policy rollout"
                className="text-sm"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || exporting}
            data-testid="create-label-button"
          >
            {pendingAction === 'create' ? 'Saving…' : 'Add label'}
          </Button>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <div>Export labels (JSONL)</div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={!recapSlug || exporting}
              data-testid="export-labels-button"
            >
              {exporting ? 'Exporting…' : 'Export labels'}
            </Button>
            {!recapSlug ? (
              <span className="text-xs">Publish a recap to enable exports.</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Labels</CardTitle>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Filter</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as 'all' | LabelType)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm"
              >
                <option value="all">All types</option>
                {LABEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredLabels.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
              No labels yet.
            </div>
          ) : (
            filteredLabels.map((label) => {
              const edit = edits[label.id] ?? {
                type: label.label_type,
                value: label.label_value ?? '',
              };
              const isBusy =
                pendingAction === `update:${label.id}` || pendingAction === `delete:${label.id}`;
              return (
                <div
                  key={label.id}
                  className="space-y-2 rounded border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900"
                  data-testid={`label-row-${label.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{label.label_type.replace(/_/g, ' ')}</Badge>
                    <div className="text-xs text-slate-500">
                      {label.start_offset} – {label.end_offset}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Created {DATE_FORMATTER.format(new Date(label.created_at))}
                  </div>
                  <div data-testid={`label-snippet-${label.id}`} className="font-mono text-xs">
                    {labelSnippet(label)}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr,1fr]">
                    <select
                      value={edit.type}
                      onChange={(event) =>
                        setEdits((prev) => ({
                          ...prev,
                          [label.id]: { ...edit, type: event.target.value as LabelType },
                        }))
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                      disabled={isBusy}
                    >
                      {LABEL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={edit.value}
                      onChange={(event) =>
                        setEdits((prev) => ({
                          ...prev,
                          [label.id]: { ...edit, value: event.target.value },
                        }))
                      }
                      placeholder="Label value"
                      className="text-xs"
                      disabled={isBusy}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleUpdate(label.id)}
                      disabled={isBusy}
                      data-testid={`update-label-${label.id}`}
                    >
                      {pendingAction === `update:${label.id}` ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(label.id)}
                      disabled={isBusy}
                      data-testid={`delete-label-${label.id}`}
                    >
                      {pendingAction === `delete:${label.id}` ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
