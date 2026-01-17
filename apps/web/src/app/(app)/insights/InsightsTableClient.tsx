'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Toolbar } from '@/components/layout';
import { cn } from '@/lib/utils';
import { ArrowDownUp, LayoutGrid, List } from 'lucide-react';
import { InsightsSessionRow, TopTerm } from './types';

type InsightsTableClientProps = {
  roomLinkPrefetch?: boolean;
  sessions: InsightsSessionRow[];
};

type SortKey = 'activity' | 'answered' | 'rejected' | 'rejection_rate' | 'avg_time';

type DisplayRow = {
  id: string;
  status: 'scheduled' | 'live' | 'ended' | string;
  figureName: string;
  figureSlug: string;
  roomTitle: string;
  roomSlug: string;
  answered: number | null;
  total: number | null;
  rejected: number | null;
  rejectionRate: number | null;
  avgTimeSeconds: number | null;
  computedAt: string | null;
  topTerms: TopTerm[] | null;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STATUS_VARIANTS: Record<string, 'secondary' | 'destructive' | 'outline'> = {
  live: 'destructive',
  scheduled: 'secondary',
  ended: 'outline',
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'activity', label: 'Last activity' },
  { value: 'answered', label: 'Answered' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'rejection_rate', label: 'Rejection rate' },
  { value: 'avg_time', label: 'Avg time to answer' },
];

const STATUS_FILTERS = ['all', 'scheduled', 'live', 'ended'] as const;

function formatPercent(value: number | null) {
  if (value == null) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatSeconds(value: number | null) {
  if (value == null) return '—';
  const seconds = Math.round(value);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function buildSessionLabel(status: string) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function createRoomUrl(figureSlug: string, roomSlug: string) {
  if (!figureSlug || !roomSlug) return '#';
  return `/rooms/${figureSlug}/${roomSlug}`;
}

export function InsightsTableClient({ sessions, roomLinkPrefetch }: InsightsTableClientProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const [density, setDensity] = useState<'default' | 'compact'>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sortKey, setSortKey] = useState<SortKey>('activity');

  const rows = useMemo<DisplayRow[]>(
    () =>
      sessions.map((session) => {
        const insight = session.session_insights?.[0] ?? null;
        const room = session.rooms?.[0] ?? null;
        const figure = room?.public_figures?.[0] ?? null;
        return {
          id: session.id,
          status: session.status ?? 'scheduled',
          figureName: figure?.name ?? 'Figure',
          figureSlug: figure?.slug ?? '',
          roomTitle: room?.title ?? 'Room',
          roomSlug: room?.slug ?? '',
          answered: insight?.questions_answered ?? null,
          total: insight?.questions_total ?? null,
          rejected: insight?.questions_rejected ?? null,
          rejectionRate: insight?.rejection_rate ?? null,
          avgTimeSeconds: insight?.avg_time_to_answer_seconds ?? null,
          computedAt: insight?.computed_at ?? null,
          topTerms: insight?.top_terms ?? null,
        };
      }),
    [sessions],
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    const base = rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack = `${row.figureName} ${row.roomTitle} ${row.status}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const direction = sortDirection === 'asc' ? 1 : -1;

    const getSortValue = (row: DisplayRow) => {
      switch (sortKey) {
        case 'activity':
          return row.computedAt ? new Date(row.computedAt).getTime() : 0;
        case 'answered':
          return row.answered ?? 0;
        case 'rejected':
          return row.rejected ?? 0;
        case 'rejection_rate':
          return row.rejectionRate ?? 0;
        case 'avg_time':
          return row.avgTimeSeconds ?? 0;
        default:
          return 0;
      }
    };

    return [...base].sort((a, b) => direction * (getSortValue(a) - getSortValue(b)));
  }, [rows, normalizedQuery, statusFilter, sortDirection, sortKey]);

  const tableSize = density === 'compact' ? 'dense' : 'md';

  const handleSortHeader = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortKey(key);
    setSortDirection('desc');
  };

  return (
    <div className="space-y-3">
      <Toolbar
        left={
          <>
            <Input
              placeholder="Search rooms, figures, or status"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-[220px] flex-1"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-[0.3em] text-muted-foreground" htmlFor="status-filter">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {STATUS_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {value === 'all' ? 'All sessions' : buildSessionLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </>
        }
        right={
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm">
              <span className="uppercase tracking-[0.3em] text-[0.65rem] text-slate-400">Sort</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="bg-transparent text-xs font-semibold text-slate-900"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                aria-label={`Sort direction ${sortDirection}`}
              >
                <ArrowDownUp className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-xs text-slate-500">
              <span className="uppercase tracking-[0.3em] text-[0.65rem] text-slate-400">Density</span>
              <Button
                variant={density === 'default' ? 'secondary' : 'ghost'}
                size="sm"
                className="p-1"
                onClick={() => setDensity('default')}
                aria-pressed={density === 'default'}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant={density === 'compact' ? 'secondary' : 'ghost'}
                size="sm"
                className="p-1"
                onClick={() => setDensity('compact')}
                aria-pressed={density === 'compact'}
              >
                <List className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        }
        className="gap-4"
      />

      <Table
        size={tableSize}
        stickyHeader
        containerClassName="rounded-2xl border border-slate-200 shadow-sm"
        className="min-w-full"
      >
        <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead
            aria-sort={
              sortKey === 'activity'
                ? sortDirection === 'desc'
                  ? 'descending'
                  : 'ascending'
                : 'none'
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-slate-900"
              onClick={() => handleSortHeader('activity')}
            >
              Session
              <ArrowDownUp
                className={cn(
                  'h-3 w-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
                  sortKey === 'activity' ? 'text-slate-900' : 'text-slate-400',
                )}
                aria-hidden
              />
            </button>
          </TableHead>
          <TableHead
            className="text-right"
            aria-sort={
              sortKey === 'answered'
                ? sortDirection === 'desc'
                  ? 'descending'
                  : 'ascending'
                : 'none'
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-slate-900"
              onClick={() => handleSortHeader('answered')}
            >
              Answered
              <ArrowDownUp
                className={cn(
                  'h-3 w-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
                  sortKey === 'answered' ? 'text-slate-900' : 'text-slate-400',
                )}
                aria-hidden
              />
            </button>
          </TableHead>
          <TableHead
            className="text-right"
            aria-sort={
              sortKey === 'rejected'
                ? sortDirection === 'desc'
                  ? 'descending'
                  : 'ascending'
                : 'none'
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-slate-900"
              onClick={() => handleSortHeader('rejected')}
            >
              Rejected
              <ArrowDownUp
                className={cn(
                  'h-3 w-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
                  sortKey === 'rejected' ? 'text-slate-900' : 'text-slate-400',
                )}
                aria-hidden
              />
            </button>
          </TableHead>
          <TableHead
            className="text-right"
            aria-sort={
              sortKey === 'rejection_rate'
                ? sortDirection === 'desc'
                  ? 'descending'
                  : 'ascending'
                : 'none'
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-slate-900"
              onClick={() => handleSortHeader('rejection_rate')}
            >
              Rejection rate
              <ArrowDownUp
                className={cn(
                  'h-3 w-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
                  sortKey === 'rejection_rate' ? 'text-slate-900' : 'text-slate-400',
                )}
                aria-hidden
              />
            </button>
          </TableHead>
          <TableHead
            className="text-right"
            aria-sort={
              sortKey === 'avg_time'
                ? sortDirection === 'desc'
                  ? 'descending'
                  : 'ascending'
                : 'none'
            }
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 font-semibold text-slate-900"
              onClick={() => handleSortHeader('avg_time')}
            >
              Avg time-to-answer
              <ArrowDownUp
                className={cn(
                  'h-3 w-3 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
                  sortKey === 'avg_time' ? 'text-slate-900' : 'text-slate-400',
                )}
                aria-hidden
              />
            </button>
          </TableHead>
          <TableHead>Top terms</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((row) => {
            const roomUrl = createRoomUrl(row.figureSlug, row.roomSlug);
            const topTermLabel =
              row.topTerms && row.topTerms.length
                ? row.topTerms.map((term) => `${term.term} (${term.count})`).join(', ')
                : '';
            const displayTerms = row.topTerms?.slice(0, 4) ?? [];

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{row.figureName}</div>
                  <div className="text-xs text-muted-foreground">{row.roomTitle}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={STATUS_VARIANTS[row.status] ?? 'outline'} className="max-w-fit">
                      {buildSessionLabel(row.status)}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {row.computedAt ? DATE_FORMATTER.format(new Date(row.computedAt)) : 'No insights yet'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-slate-900 tabular-nums">
                  {row.answered ?? '—'} / {row.total ?? '—'}
                </TableCell>
                <TableCell className="text-right text-slate-900 tabular-nums">
                  {row.rejected ?? '—'}
                </TableCell>
                <TableCell className="text-right text-slate-900 tabular-nums">
                  {formatPercent(row.rejectionRate)}
                </TableCell>
                <TableCell className="text-right text-slate-900 tabular-nums">
                  {formatSeconds(row.avgTimeSeconds)}
                </TableCell>
                <TableCell>
                  {displayTerms.length ? (
                    <div
                      className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                      title={topTermLabel}
                    >
                      {displayTerms.map((term) => (
                        <span key={term.term} className="rounded-full border px-2 py-1">
                          {term.term}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={roomUrl} prefetch={roomLinkPrefetch}>
                      View room
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
