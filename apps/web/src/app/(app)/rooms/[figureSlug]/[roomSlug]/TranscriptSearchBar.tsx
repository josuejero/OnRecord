'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { transcriptSearchStore, useTranscriptSearchTerm } from './transcript-search-store';

type TranscriptSearchBarProps = {
  matchCount?: number;
  className?: string;
};

export function TranscriptSearchBar({ matchCount, className }: TranscriptSearchBarProps) {
  const searchTerm = useTranscriptSearchTerm();

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Input
        value={searchTerm}
        onChange={(event) => transcriptSearchStore.set(event.currentTarget.value)}
        placeholder="Search transcript"
        className="min-w-[180px]"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => transcriptSearchStore.set('')}
        disabled={!searchTerm}
      >
        Clear
      </Button>
      {matchCount !== undefined ? (
        <span className="text-xs text-slate-500">
          {matchCount} match{matchCount === 1 ? '' : 'es'}
        </span>
      ) : null}
    </div>
  );
}
