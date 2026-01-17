import { NextResponse } from 'next/server';

import { supabaseServer } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require';
import type { CommandPaletteSearchResult, CommandPaletteGroup } from '@/types/command-palette';

const MIN_QUERY_LENGTH = 2;
const ROOM_LIMIT = 6;
const SESSION_LIMIT = 6;
const RECAP_LIMIT = 5;
const ASSET_LIMIT = 5;
const TERM_LIMIT = 6;

function buildRoomHref(
  figureSlug: string | null | undefined,
  roomSlug: string | null | undefined,
) {
  if (!figureSlug || !roomSlug) {
    return null;
  }

  return `/rooms/${encodeURIComponent(figureSlug)}/${encodeURIComponent(roomSlug)}`;
}

function normalizeQuery(query: string) {
  return query.trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams.get('q') ?? '');

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [] });
  }

  await requireUser();
  const supabase = supabaseServer();

  const roomResults = await searchRooms(supabase, query);
  const sessionResults = await searchSessions(supabase, query);
  const recapResults = await searchRecaps(supabase, query);
  const assetResults = await searchAssets(supabase, query);
  const termResults = await searchTerms(supabase, query);

  const results = [
    ...roomResults,
    ...sessionResults,
    ...recapResults,
    ...assetResults,
    ...termResults,
  ];

  return NextResponse.json({ results });
}

async function searchRooms(
  supabase: ReturnType<typeof supabaseServer>,
  query: string,
): Promise<CommandPaletteSearchResult[]> {
  const pattern = `%${query}%`;

  const [titleResult, figureResult] = await Promise.all([
    supabase
      .from('rooms')
      .select('id, slug, title, public_figures ( slug, name )')
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(ROOM_LIMIT),
    supabase
      .from('rooms')
      .select('id, slug, title, public_figures ( slug, name )')
      .ilike('public_figures.name', pattern)
      .order('updated_at', { ascending: false })
      .limit(ROOM_LIMIT),
  ]);

  const merged = mergeUniqueById(
    [...(titleResult.data ?? []), ...(figureResult.data ?? [])] as {
      id: string;
      slug: string;
      title: string;
      public_figures?: { slug?: string; name?: string } | null;
    }[],
  ).slice(0, ROOM_LIMIT);

  return merged
    .map((room) => {
      const figure = room.public_figures;
      const href = buildRoomHref(figure?.slug, room.slug);
      if (!href) return null;

      return {
        id: `room:${room.id}`,
        type: 'room' as const,
        group: 'Rooms' as CommandPaletteGroup,
        label: room.title,
        description: figure?.name ? `Figure: ${figure.name}` : 'Open room',
        href,
        metadata: {
          figureName: figure?.name,
          roomTitle: room.title,
        },
      };
    })
    .filter((entry): entry is CommandPaletteSearchResult => Boolean(entry));
}

async function searchSessions(
  supabase: ReturnType<typeof supabaseServer>,
  query: string,
): Promise<CommandPaletteSearchResult[]> {
  const pattern = `%${query}%`;

  const [titleResults, figureResults] = await Promise.all([
    supabase
      .from('sessions')
      .select(
        `id, status, starts_at, ends_at, rooms (
           slug, title, public_figures ( slug, name )
         )`,
      )
      .ilike('rooms.title', pattern)
      .order('updated_at', { ascending: false })
      .limit(SESSION_LIMIT),
    supabase
      .from('sessions')
      .select(
        `id, status, starts_at, ends_at, rooms (
           slug, title, public_figures ( slug, name )
         )`,
      )
      .ilike('rooms.public_figures.name', pattern)
      .order('updated_at', { ascending: false })
      .limit(SESSION_LIMIT),
  ]);

  const merged = mergeUniqueById(
    [...(titleResults.data ?? []), ...(figureResults.data ?? [])] as Array<{
      id: string;
      status: string;
      starts_at: string | null;
      ends_at: string | null;
      rooms?: {
        slug?: string;
        title?: string;
        public_figures?: { slug?: string; name?: string } | null;
      } | null;
    }>,
  ).slice(0, SESSION_LIMIT);

  return merged
    .map((session) => {
      const room = session.rooms;
      const figure = room?.public_figures;
      const href = buildRoomHref(figure?.slug, room?.slug);
      if (!href) return null;

      const status = session.status ?? 'session';
      const label = `${room?.title ?? 'Room'} · ${status}`;
      return {
        id: `session:${session.id}`,
        type: 'session' as const,
        group: 'Sessions' as CommandPaletteGroup,
        label,
        description: figure?.name
          ? `${figure.name} · ${capitalize(status)}`
          : `Session · ${capitalize(status)}`,
        href,
        metadata: {
          figureName: figure?.name,
          roomTitle: room?.title,
          sessionStatus: session.status,
        },
      };
    })
    .filter((entry): entry is CommandPaletteSearchResult => Boolean(entry));
}

async function searchRecaps(
  supabase: ReturnType<typeof supabaseServer>,
  query: string,
): Promise<CommandPaletteSearchResult[]> {
  const pattern = `%${query}%`;

  const [titleMatches, slugMatches] = await Promise.all([
    supabase
      .from('recap_pages')
      .select(
        `id, slug, title, sessions (
          rooms (
            slug, title, public_figures ( slug, name )
          )
        )`,
      )
      .ilike('title', pattern)
      .order('updated_at', { ascending: false })
      .limit(RECAP_LIMIT),
    supabase
      .from('recap_pages')
      .select(
        `id, slug, title, sessions (
          rooms (
            slug, title, public_figures ( slug, name )
          )
        )`,
      )
      .ilike('slug', pattern)
      .order('updated_at', { ascending: false })
      .limit(RECAP_LIMIT),
  ]);

  const merged = mergeUniqueById(
    [...(titleMatches.data ?? []), ...(slugMatches.data ?? [])] as Array<{
      id: string;
      slug: string;
      title: string;
      sessions?: {
        rooms?: {
          slug?: string;
          title?: string;
          public_figures?: { name?: string } | null;
        } | null;
      } | null;
    }>,
  ).slice(0, RECAP_LIMIT);

  return merged
    .map((recap) => {
      if (!recap.slug) return null;

      const room = recap.sessions?.rooms;
      const figureName = room?.public_figures?.name;
      return {
        id: `recap:${recap.id}`,
        type: 'recap' as const,
        group: 'Actions' as CommandPaletteGroup,
        label: recap.title,
        description: figureName
          ? `${figureName} · ${room?.title ?? 'Room'}`
          : 'Public recap',
        href: `/recaps/${recap.slug}`,
        metadata: {
          figureName,
          roomTitle: room?.title,
        },
      };
    })
    .filter((entry): entry is CommandPaletteSearchResult => Boolean(entry));
}

async function searchAssets(
  supabase: ReturnType<typeof supabaseServer>,
  query: string,
): Promise<CommandPaletteSearchResult[]> {
  const pattern = `%${query}%`;

  const { data, error } = await supabase
    .from('assets')
    .select(
      `id, original_filename, visibility, public_url, sessions (
         rooms (
           slug, title, public_figures ( slug, name )
         )
      )`,
    )
    .ilike('original_filename', pattern)
    .order('created_at', { ascending: false })
    .limit(ASSET_LIMIT);

  if (error || !data) return [];

  return (data as Array<{
    id: string;
    original_filename?: string | null;
    visibility?: string | null;
    public_url?: string | null;
    sessions?: {
      rooms?: {
        slug?: string;
        title?: string;
        public_figures?: { slug?: string; name?: string } | null;
      } | null;
    } | null;
  }>)
    .map((asset) => {
      const room = asset.sessions?.rooms;
      const figure = room?.public_figures;
      const roomHref = buildRoomHref(figure?.slug, room?.slug);
      const isPublic = asset.visibility === 'public' && asset.public_url;
      const label = asset.original_filename ?? 'Asset file';
      const descriptionParts = [];
      if (figure?.name) descriptionParts.push(figure.name);
      if (room?.title) descriptionParts.push(room.title);
      descriptionParts.push(asset.visibility === 'public' ? 'Public asset' : 'Private asset');

      return {
        id: `asset:${asset.id}`,
        type: 'asset' as const,
        group: 'Actions' as CommandPaletteGroup,
        label,
        description: descriptionParts.filter(Boolean).join(' · '),
        href: isPublic ? asset.public_url : roomHref ?? null,
        metadata: {
          figureName: figure?.name,
          roomTitle: room?.title,
        },
      };
    })
    .filter((entry): entry is CommandPaletteSearchResult => Boolean(entry))
    .slice(0, ASSET_LIMIT);
}

async function searchTerms(
  supabase: ReturnType<typeof supabaseServer>,
  query: string,
): Promise<CommandPaletteSearchResult[]> {
  const lowerQuery = query.toLowerCase();

  const { data, error } = await supabase
    .from('sessions')
    .select(
      `id, status, rooms (
         slug, title, public_figures ( slug, name )
       ),
       session_insights ( top_terms )`,
    )
    .order('updated_at', { ascending: false })
    .limit(60);

  if (error || !data) return [];

  const matches: CommandPaletteSearchResult[] = [];
  const seen = new Set<string>();

  (data as Array<{
    id: string;
    status?: string | null;
    rooms?: {
      slug?: string;
      title?: string;
      public_figures?: { slug?: string; name?: string } | null;
    } | null;
    session_insights?: {
      top_terms?: Array<{ term?: string; count?: number }> | null;
    } | null;
  }>).forEach((session) => {
    const room = session.rooms;
    const figure = room?.public_figures;
    const href = buildRoomHref(figure?.slug, room?.slug);
    if (!href) return;

    (session.session_insights?.top_terms ?? []).forEach((term) => {
      const termLabel = term.term?.trim();
      if (!termLabel) return;
      if (!termLabel.toLowerCase().includes(lowerQuery)) return;
      const key = `${session.id}:${termLabel}`;
      if (seen.has(key)) return;
      seen.add(key);

      matches.push({
        id: `term:${session.id}:${termLabel}`,
        type: 'term',
        group: 'Help',
        label: termLabel,
        description: `${figure?.name ?? 'Figure'} · ${room?.title ?? 'Room'} · ${term.count ?? 0} mentions`,
        href,
        metadata: {
          figureName: figure?.name,
          roomTitle: room?.title,
          termCount: term.count,
          sessionStatus: session.status ?? undefined,
        },
      });
    });
  });

  return matches.slice(0, TERM_LIMIT);
}

function mergeUniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }
  return Array.from(seen.values());
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
