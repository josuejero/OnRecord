'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowDown, Clock, Tag } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TranscriptSearchBar } from './TranscriptSearchBar';
import { useTranscriptSearchTerm } from './transcript-search-store';

export type TranscriptSpanLabel = {
  start_offset: number;
  end_offset: number;
  label_type: string;
  label_value?: string | null;
};

type Segment = {
  text: string;
  label?: TranscriptSpanLabel;
};

type TranscriptViewerProps = {
  cleanedText: string;
  rawText: string;
  labels: TranscriptSpanLabel[];
  processedAt?: string | null;
  updatedAt?: string | null;
};

export function TranscriptViewer({
  cleanedText,
  rawText,
  labels,
  processedAt,
  updatedAt,
}: TranscriptViewerProps) {
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const searchTerm = useTranscriptSearchTerm();
  const sourceText = showTimestamps && rawText ? rawText : cleanedText || rawText || '';
  const normalizedLabels = useMemo(
    () => [...labels].sort((a, b) => a.start_offset - b.start_offset),
    [labels],
  );

  const segments = useMemo(() => buildSegments(sourceText, normalizedLabels), [normalizedLabels, sourceText]);
  const matchCount = useMemo(() => {
    if (!searchTerm) return 0;
    const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
    let count = 0;
    while (regex.exec(sourceText)) {
      count += 1;
    }
    return count;
  }, [searchTerm, sourceText]);

  const jumpToLatest = () => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const toggleTimestamps = () => setShowTimestamps((prev) => !prev);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={jumpToLatest}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-300"
        >
          <ArrowDown className="h-3 w-3" />
          Jump to latest
        </button>

        <button
          type="button"
          onClick={toggleTimestamps}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
            showTimestamps
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
          )}
        >
          <Clock className="h-3 w-3" />
          {showTimestamps ? 'Hide timestamps' : 'Show timestamps'}
        </button>

        <div className="flex-1 min-w-[180px]">
          <TranscriptSearchBar matchCount={matchCount} />
        </div>
      </div>

      <div ref={transcriptRef} className="flex-1 min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
        {segments.length ? (
          segments.map((segment, idx) => (
            <span
              key={`${segment.text.slice(0, 10)}-${idx}`}
              className={cn('block whitespace-pre-wrap', segment.label ? 'rounded-md border border-emerald-200 bg-emerald-50/70 px-1 py-[0.15rem]' : '')}
              data-label-type={segment.label?.label_type}
            >
              {highlightMatches(segment.text, searchTerm)}
            </span>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">Transcript will appear here once saved.</div>
        )}
      </div>

      {normalizedLabels.length ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-900">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
            <Tag className="h-3 w-3" />
            Highlighted spans
          </div>
          <div className="space-y-1 text-emerald-900/90">
            {normalizedLabels.map((label) => (
              <div key={`${label.label_type}-${label.start_offset}-${label.end_offset}`} className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">{label.label_type.replace(/_/g, ' ')}</span>
                <span className="text-emerald-800/80">
                  {label.label_value ?? 'flagged span'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
        <span>Source: {showTimestamps ? 'raw transcript' : 'cleaned transcript'}</span>
        {processedAt ? <span>Processed: {formatTimestamp(processedAt)}</span> : null}
        {updatedAt ? <span>Updated: {formatTimestamp(updatedAt)}</span> : null}
      </div>
    </div>
  );
}

function buildSegments(text: string, labels: TranscriptSpanLabel[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const label of labels) {
    const start = Math.max(0, Math.min(text.length, label.start_offset));
    const end = Math.max(start, Math.min(text.length, label.end_offset));

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }

    if (end > start) {
      segments.push({ text: text.slice(start, end), label });
    }

    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  if (!segments.length && text.length) {
    segments.push({ text });
  }

  return segments;
}

function highlightMatches(text: string, term: string) {
  if (!term) return <>{text}</>;
  const regex = new RegExp(escapeRegExp(term), 'gi');
  const parts: Array<string | JSX.Element> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(text)) !== null) {
    const prefix = text.slice(lastIndex, match.index);
    if (prefix) parts.push(prefix);
    parts.push(
      <mark key={`${match.index}-${match[0]}`} className="rounded bg-amber-200 px-[0.15rem] text-amber-800">
        {match[0]}
      </mark>,
    );
    lastIndex = match.index + match[0].length;
    if (regex.lastIndex === match.index) {
      regex.lastIndex += 1;
    }
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
