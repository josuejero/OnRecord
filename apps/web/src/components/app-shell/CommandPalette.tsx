'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import type { AppNavItem } from './nav';
import type {
  CommandPaletteGroup,
  CommandPaletteSearchResult,
} from '@/types/command-palette';

const REMOTE_MIN_QUERY_LENGTH = 2;

type LocalCommand = {
  id: string;
  label: string;
  description?: string | null;
  href?: string;
  group: CommandPaletteGroup;
};

type CommandPaletteProps = {
  navItems: AppNavItem[];
  recentRooms: Array<{ label: string; href: string }>;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
};

export default function CommandPalette({
  navItems,
  recentRooms,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteResults, setRemoteResults] = useState<CommandPaletteSearchResult[]>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const shouldSearchRemote = normalizedQuery.length >= REMOTE_MIN_QUERY_LENGTH;

  const roomCommand = navItems.find((item) => item.href === '/rooms');

  const localRoomCommands = useMemo<LocalCommand[]>(() => {
    const roomCommands: LocalCommand[] = [];

    if (roomCommand) {
      roomCommands.push({
        id: `nav-${roomCommand.href}`,
        label: roomCommand.title,
        description: roomCommand.description ?? null,
        href: roomCommand.href,
        group: 'Rooms',
      });
    }

    recentRooms.slice(0, 6).forEach((room, index) => {
      roomCommands.push({
        id: `recent-room-${index}-${room.href}`,
        label: room.label,
        description: 'Recent room',
        href: room.href,
        group: 'Rooms',
      });
    });

    return roomCommands;
  }, [roomCommand, recentRooms]);

  const localActionCommands = useMemo<LocalCommand[]>(() => {
    return navItems
      .filter((item) => item.href !== '/rooms')
      .map((item) => ({
        id: `nav-${item.href}`,
        label: item.title,
        description: item.description ?? null,
        href: item.href,
        group: 'Actions',
      }));
  }, [navItems]);

  const filteredLocalRooms = useMemo(
    () => filterLocalCommands(localRoomCommands, normalizedQuery),
    [localRoomCommands, normalizedQuery],
  );
  const filteredLocalActions = useMemo(
    () => filterLocalCommands(localActionCommands, normalizedQuery),
    [localActionCommands, normalizedQuery],
  );

  const emptyMessage =
    shouldSearchRemote && isSearching ? 'Searching…' : 'No matches found.';

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || !shouldSearchRemote) {
      Promise.resolve().then(() => setIsSearching(false));
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    Promise.resolve().then(() => {
      if (isActive) {
        setIsSearching(true);
      }
    });

    fetch(`/api/command-search?q=${encodeURIComponent(searchTerm)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load search results');
        }
        const payload = (await response.json()) as { results?: CommandPaletteSearchResult[] };
        return payload.results ?? [];
      })
      .then((results) => {
        if (isActive) {
          setRemoteResults(results);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsSearching(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [searchTerm, open, shouldSearchRemote]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchTerm('');
      setRemoteResults([]);
      setIsSearching(false);
    }
    onOpenChange(nextOpen);
  };

  const visibleRemoteResults = shouldSearchRemote ? remoteResults : [];

  const groups = [
    {
      heading: 'Rooms',
      localItems: filteredLocalRooms,
      remoteItems: visibleRemoteResults.filter((result) => result.group === 'Rooms'),
    },
    {
      heading: 'Sessions',
      localItems: [],
      remoteItems: visibleRemoteResults.filter((result) => result.group === 'Sessions'),
    },
    {
      heading: 'Actions',
      localItems: filteredLocalActions,
      remoteItems: visibleRemoteResults.filter((result) => result.group === 'Actions'),
    },
    {
      heading: 'Help',
      localItems: [],
      remoteItems: visibleRemoteResults.filter((result) => result.group === 'Help'),
    },
  ].filter((group) => group.localItems.length > 0 || group.remoteItems.length > 0);

  const handleSelect = (href?: string) => {
    if (!href) return;
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="w-[min(96vw,960px)] p-6 sm:p-8">
        <Command className="space-y-3">
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder="Search rooms, sessions, recaps, assets, terms"
            aria-label="Command palette"
            autoFocus
          />
          <p className="text-xs text-slate-500">
            Navigate with arrows, Enter, and Escape. Cmd/Ctrl+K to reopen.
          </p>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups.map((group, index) => (
              <Fragment key={group.heading}>
                <CommandGroup heading={group.heading}>
                  {group.localItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.label}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                      {item.description ? (
                        <span className="text-xs text-slate-500">{item.description}</span>
                      ) : null}
                    </CommandItem>
                  ))}
                  {group.remoteItems.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.label}
                      onSelect={() => handleSelect(result.href)}
                    >
                      <span className="text-sm font-semibold text-slate-900">{result.label}</span>
                      {result.description ? (
                        <span className="text-xs text-slate-500">{result.description}</span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {index < groups.length - 1 && <CommandSeparator />}
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function filterLocalCommands(commands: LocalCommand[], query: string) {
  if (!query) {
    return commands;
  }

  return commands.filter((command) => {
    const haystack = `${command.label} ${command.description ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
}
