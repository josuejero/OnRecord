'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { List, Search } from 'lucide-react';

import { TranscriptSearchBar } from './TranscriptSearchBar';

export function RoomHeaderActions() {
  const scrollToQueue = () => {
    const target = document.getElementById('queue-panel');
    if (!target) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="flex items-center gap-2" data-testid="room-header-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={scrollToQueue}
        data-testid="room-queue-trigger"
      >
        <List className="h-4 w-4" />
        <span>Queue</span>
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            data-testid="room-search-trigger"
          >
            <Search className="h-4 w-4" />
            <span>Search transcript</span>
          </Button>
        </DialogTrigger>
        <DialogContent data-testid="room-search-dialog">
          <DialogHeader>
            <DialogTitle>Search transcript</DialogTitle>
            <DialogDescription>
              Find keywords or labels in the current transcript.
            </DialogDescription>
          </DialogHeader>
          <TranscriptSearchBar />
        </DialogContent>
      </Dialog>
    </div>
  );
}
