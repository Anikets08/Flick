import type { TabSummary } from '@/lib/search/tab-search';
import type { CommandItem } from '@/types';

/**
 * Tab listing, bookmark search, and (if the optional permission is granted)
 * history search. Runs in the background service worker — content scripts
 * can't call these APIs directly.
 */

export interface BrowserSearchResults {
  bookmarks: CommandItem[];
  history: CommandItem[];
}

export const EMPTY_BROWSER_RESULTS: BrowserSearchResults = { bookmarks: [], history: [] };

const MAX_BOOKMARKS = 5;
const MAX_HISTORY = 5;

export async function hasHistoryPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({ permissions: ['history'] });
  } catch {
    return false;
  }
}

export async function listTabs(excludeTabId?: number): Promise<TabSummary[]> {
  const tabs = await browser.tabs.query({});
  return tabs
    .filter((tab) => tab.id != null && tab.id !== excludeTabId && tab.url)
    .map((tab) => ({ id: tab.id!, windowId: tab.windowId, title: tab.title ?? '', url: tab.url! }));
}

async function searchBookmarks(query: string): Promise<CommandItem[]> {
  const nodes = await browser.bookmarks.search(query);
  return nodes
    .filter((node) => node.url)
    .slice(0, MAX_BOOKMARKS)
    .map((node) => ({
      id: `bookmark-${node.id}`,
      title: node.title || node.url!,
      subtitle: node.url,
      category: 'bookmark',
      action: { type: 'navigate', url: node.url! },
    }));
}

async function searchHistory(query: string, seenUrls: Set<string>): Promise<CommandItem[]> {
  if (!(await hasHistoryPermission())) return [];

  const entries = await browser.history.search({ text: query, maxResults: 25, startTime: 0 });
  return entries
    .filter((entry) => entry.url && !seenUrls.has(entry.url))
    .slice(0, MAX_HISTORY)
    .map((entry) => ({
      id: `history-${entry.id}`,
      title: entry.title || entry.url!,
      subtitle: entry.url,
      category: 'history',
      action: { type: 'navigate', url: entry.url! },
    }));
}

export async function searchBrowser(query: string): Promise<BrowserSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_BROWSER_RESULTS;

  const bookmarks = await searchBookmarks(trimmed).catch(() => []);
  const history = await searchHistory(trimmed, new Set(bookmarks.map((item) => item.subtitle!))).catch(() => []);
  return { bookmarks, history };
}
