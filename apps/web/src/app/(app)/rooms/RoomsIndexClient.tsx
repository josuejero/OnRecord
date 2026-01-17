'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LayoutGrid, List, ArrowUpDown } from 'lucide-react';

export type RoomIndexRow = {
  id: string;
  title: string;
  slug: string;
  figureName: string;
  figureSlug: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastSession?: {
    status: 'scheduled' | 'live' | 'ended';
    updatedAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
};

type RoomsIndexClientProps = {
  roomLinkPrefetch?: boolean;
  rooms: RoomIndexRow[];
};

type RoomState = 'live' | 'scheduled' | 'ended' | 'idle';

const stateConfig: Record<
  RoomState,
  { label: string; variant: 'secondary' | 'outline' | 'destructive' }
> = {
  live: { label: 'Live', variant: 'destructive' },
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  ended: { label: 'Ended', variant: 'outline' },
  idle: { label: 'Idle', variant: 'outline' },
};

const sortOptions: { value: 'activity' | 'title' | 'figure'; label: string }[] = [
  { value: 'activity', label: 'Last activity' },
  { value: 'title', label: 'Room title' },
  { value: 'figure', label: 'Public figure' },
];

const statusFilters: { value: 'all' | RoomState; label: string }[] = [
  { value: 'all', label: 'All states' },
  { value: 'live', label: 'Live' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Ended' },
  { value: 'idle', label: 'Idle' },
];

type SortBy = (typeof sortOptions)[number]['value'];
type SortDirection = 'asc' | 'desc';
type Density = 'tile' | 'compact';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRelative(value: string | null | undefined) {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${Math.abs(days)}d ago`;
}

export function RoomsIndexClient({ rooms, roomLinkPrefetch }: RoomsIndexClientProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RoomState>('all');
  const [sortBy, setSortBy] = useState<SortBy>('activity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [density, setDensity] = useState<Density>('tile');

  const normalizedQuery = query.trim().toLowerCase();

  const preparedRooms = useMemo(() => {
    const base = rooms.map((room) => {
      const updated = room.lastSession?.updatedAt ?? room.updatedAt ?? room.createdAt;
      const state = (room.lastSession?.status as RoomState) ?? 'idle';
      return { room, updated, state };
    });

    const filtered = base.filter(({ room, state }) => {
      if (statusFilter !== 'all' && statusFilter !== state) return false;
      if (!normalizedQuery) return true;
      const haystack = `${room.title} ${room.figureName}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    const sorted = [...filtered].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'activity': {
          const left = a.updated ? new Date(a.updated).getTime() : 0;
          const right = b.updated ? new Date(b.updated).getTime() : 0;
          return direction * (left - right);
        }
        case 'title': {
          return direction * a.room.title.localeCompare(b.room.title);
        }
        case 'figure': {
          return direction * a.room.figureName.localeCompare(b.room.figureName);
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [rooms, normalizedQuery, statusFilter, sortBy, sortDirection]);

  const densityClasses =
    density === 'tile' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search figures or rooms"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-[220px] flex-1"
        />
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
        >
          {statusFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort by {option.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 px-3"
          onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          aria-label="Toggle sort direction"
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden />
        </Button>
        <div className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-500">
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Density</span>
          <Button
            variant={density === 'tile' ? 'secondary' : 'ghost'}
            size="sm"
            className="p-1"
            onClick={() => setDensity('tile')}
            aria-pressed={density === 'tile'}
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

      {preparedRooms.length === 0 ? (
        <p className="text-sm text-slate-500">No rooms match the current filters.</p>
      ) : null}

      <div
        className={cn(
          'transition-colors motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none',
          densityClasses,
        )}
      >
        {preparedRooms.map(({ room, state, updated }) => {
          const stateMeta = stateConfig[state] ?? stateConfig.idle;
          const lastActivity = updated ?? '—';
          const relative = formatRelative(lastActivity === '—' ? null : lastActivity);
          const displayDate = formatDate(lastActivity === '—' ? null : lastActivity);
          const roomUrl = `/rooms/${encodeURIComponent(room.figureSlug)}/${encodeURIComponent(
            room.slug,
          )}`;

          if (density === 'compact') {
            return (
              <article
                key={room.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:border-slate-900"
              >
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Figure</p>
                  <p className="text-base font-semibold text-slate-900">{room.figureName}</p>
                  <p className="text-sm text-slate-500">{room.title}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Last activity</p>
                  <p className="font-medium text-slate-900">{displayDate}</p>
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                    {relative}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={roomUrl} prefetch={roomLinkPrefetch}>
                      Open room
                    </Link>
                  </Button>
                </div>
              </article>
            );
          }

          return (
            <article
              key={room.id}
              className="group rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:shadow-lg focus-within:ring-1 focus-within:ring-primary/70"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Figure</p>
                  <p className="text-lg font-semibold text-slate-900">{room.figureName}</p>
                </div>
                <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>
              </div>
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Room</p>
                <p className="text-2xl font-semibold text-slate-900">{room.title}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                <div>
                  <p className="text-xs text-slate-400">Last activity</p>
                  <p className="text-base text-slate-900">{displayDate}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{relative}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Link
                  className="text-sm font-semibold text-primary underline-offset-4 transition motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
                  href={roomUrl}
                  prefetch={roomLinkPrefetch}
                >
                  View room details ↗
                </Link>
                <Button size="sm" variant="outline" asChild>
                  <Link href={roomUrl} prefetch={roomLinkPrefetch}>
                    Enter room
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
