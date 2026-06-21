import { DEV_TOOLS } from '@/data/dev-tools';
import type { CommandItem } from '@/types';

export function searchDevTools(query: string): CommandItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/);

  return DEV_TOOLS.filter((tool) => {
    const searchable = [
      tool.title.toLowerCase(),
      tool.subtitle?.toLowerCase() ?? '',
      ...(tool.keywords ?? []).map((k) => k.toLowerCase()),
      tool.id.toLowerCase(),
    ].join(' ');

    return tokens.every((token) => searchable.includes(token));
  });
}
