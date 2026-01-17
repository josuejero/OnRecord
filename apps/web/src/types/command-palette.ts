export type CommandPaletteGroup = 'Rooms' | 'Sessions' | 'Actions' | 'Help';

export type CommandPaletteResultType = 'room' | 'session' | 'recap' | 'asset' | 'term';

export type CommandPaletteResultMetadata = {
  figureName?: string;
  roomTitle?: string;
  sessionStatus?: string;
  termCount?: number;
};

export type CommandPaletteSearchResult = {
  id: string;
  type: CommandPaletteResultType;
  group: CommandPaletteGroup;
  label: string;
  description?: string | null;
  href?: string | null;
  metadata?: CommandPaletteResultMetadata;
};

export type CommandPaletteSearchResponse = {
  results: CommandPaletteSearchResult[];
};
