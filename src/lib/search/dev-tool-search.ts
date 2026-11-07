import { DEV_TOOLS } from '@/data/dev-tools';
import { rankItems, type SearchOptions } from '@/lib/search/rank';
import type { CommandItem } from '@/types';

export function searchDevTools(query: string, options: SearchOptions = {}): CommandItem[] {
  if (!query.trim()) return DEV_TOOLS;

  return rankItems(
    DEV_TOOLS,
    query,
    (tool) => [
      { value: tool.title, weight: 1 },
      // Below the title so a name match ("Copy URL") beats a synonym ("Duplicate Tab").
      { value: tool.keywords, weight: 0.85 },
      { value: tool.subtitle, weight: 0.5 },
    ],
    options,
  ).map(({ item, score }) => ({ ...item, score }));
}
