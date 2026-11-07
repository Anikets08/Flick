import { rankItems, type SearchOptions } from '@/lib/search/rank';
import type { CommandItem } from '@/types';

/** Snapshot of an open tab, fetched once when the palette opens. */
export interface TabSummary {
  id: number;
  windowId: number;
  title: string;
  url: string;
}

const MAX_TABS = 6;

export function searchTabs(tabs: TabSummary[], query: string, options: SearchOptions = {}): CommandItem[] {
  if (!query.trim()) return [];

  return rankItems(
    tabs,
    query,
    (tab) => [
      { value: tab.title, weight: 1, substring: true },
      { value: tab.url, weight: 0.7, substring: true },
    ],
    options,
  )
    .slice(0, MAX_TABS)
    .map(({ item: tab, score }) => ({
      id: `tab-${tab.id}`,
      title: tab.title || tab.url,
      subtitle: tab.url,
      category: 'tab',
      action: { type: 'switch-tab', tabId: tab.id, windowId: tab.windowId },
      score,
    }));
}
