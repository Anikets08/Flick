import { useEffect, useMemo, useState } from 'preact/hooks';
import { searchAliases } from '@/lib/search/alias-search';
import { EMPTY_BROWSER_RESULTS, type BrowserSearchResults } from '@/lib/search/browser-search';
import { searchDevTools } from '@/lib/search/dev-tool-search';
import { searchSnippets } from '@/lib/search/snippet-search';
import { searchTabs, type TabSummary } from '@/lib/search/tab-search';
import { getAliases } from '@/lib/storage/aliases';
import { getRecents } from '@/lib/storage/recents';
import { getSnippets } from '@/lib/storage/snippets';
import type { CommandItem } from '@/types';
import type { UrlAlias } from '@/types';
import type { TextSnippet } from '@/types';

const BROWSER_SEARCH_DEBOUNCE_MS = 60;

/**
 * The palette stays mounted while hidden, so shortcuts, snippets, and recents
 * are loaded once and then kept current via `storage.onChanged` — reopening
 * never waits on storage.
 *
 * @param open Whether the palette is showing. Opening resets the query and
 * refreshes the open-tab list.
 * @param activeTabId Tab to leave out of open-tab results. Only needed outside
 * a content script (side panel) — otherwise the background uses the sender tab.
 */
export function useFlickSearch(open: boolean, activeTabId?: number) {
  const [aliases, setAliases] = useState<UrlAlias[]>([]);
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [storedRecents, setStoredRecents] = useState<CommandItem[]>([]);
  const [openTabs, setOpenTabs] = useState<TabSummary[]>([]);
  const [browserResults, setBrowserResults] = useState<BrowserSearchResults>(EMPTY_BROWSER_RESULTS);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getAliases(), getSnippets(), getRecents().catch(() => [])]).then(
      ([loadedAliases, loadedSnippets, loadedRecents]) => {
        if (!cancelled) {
          setAliases(loadedAliases);
          setSnippets(loadedSnippets);
          setStoredRecents(loadedRecents);
          setLoading(false);
        }
      },
    );

    const onChanged = (changes: Record<string, unknown>, area: string) => {
      const keys = Object.keys(changes);
      if (area === 'sync' && keys.some((key) => key.startsWith('alias:') || key === 'aliases')) {
        void getAliases().then((next) => !cancelled && setAliases(next));
      }
      if (area === 'sync' && keys.some((key) => key.startsWith('snippet:') || key === 'snippets')) {
        void getSnippets().then((next) => !cancelled && setSnippets(next));
      }
      if (area === 'local' && keys.includes('recents')) {
        void getRecents().then((next) => !cancelled && setStoredRecents(next));
      }
    };
    browser.storage.onChanged.addListener(onChanged);

    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  // Fetch open tabs once per palette open and search them locally, so tab
  // results update on every keystroke without a round trip to the background.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    browser.runtime
      .sendMessage({ type: 'LIST_TABS', excludeTabId: activeTabId })
      .then((tabs: TabSummary[] | undefined) => {
        if (!cancelled && tabs) setOpenTabs(tabs);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, activeTabId]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setBrowserResults(EMPTY_BROWSER_RESULTS);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      browser.runtime
        .sendMessage({ type: 'SEARCH_BROWSER', query: trimmed })
        .then((results: BrowserSearchResults | undefined) => {
          if (!cancelled && results) setBrowserResults(results);
        })
        .catch(() => {});
    }, BROWSER_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Drop recents whose shortcut/snippet has since been deleted or disabled.
  const recentResults: CommandItem[] = useMemo(() => {
    const aliasIds = new Set(aliases.map((a) => a.id));
    const snippetIds = new Set(snippets.map((s) => s.id));
    return storedRecents.filter((item) => {
      if (item.category === 'alias') return aliasIds.has(item.id);
      if (item.category === 'snippet') return snippetIds.has(item.id);
      return true;
    });
  }, [storedRecents, aliases, snippets]);

  // Direct matches first; only if every group comes up empty, retry with typo
  // tolerance so a fuzzy hit in one group can't outrank a real one in another.
  const { aliasResults, devToolResults, snippetResults, tabResults } = useMemo(() => {
    const run = (fuzzy: boolean) => ({
      aliasResults: searchAliases(aliases, query, { fuzzy }),
      devToolResults: searchDevTools(query, { fuzzy }),
      snippetResults: searchSnippets(snippets, query, { fuzzy }),
      tabResults: searchTabs(openTabs, query, { fuzzy }),
    });
    const direct = run(false);
    const anyDirect = Object.values(direct).some((results) => results.length > 0);
    return anyDirect || !query.trim() ? direct : run(true);
  }, [aliases, snippets, openTabs, query]);

  // When a matching tab is already open, show only the tab — switching beats
  // opening the same page twice.
  const { bookmarkResults, historyResults } = useMemo(() => {
    const openUrls = new Set(tabResults.map((item) => item.subtitle));
    const notOpen = (item: CommandItem) => !openUrls.has(item.subtitle ?? '');
    return {
      bookmarkResults: browserResults.bookmarks.filter(notOpen),
      historyResults: browserResults.history.filter(notOpen),
    };
  }, [tabResults, browserResults]);

  return {
    query,
    setQuery,
    recentResults,
    aliasResults,
    tabResults,
    bookmarkResults,
    historyResults,
    devToolResults,
    snippetResults,
    aliases,
    snippets,
    loading,
  };
}
