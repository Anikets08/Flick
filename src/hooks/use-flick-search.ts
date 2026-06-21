import { useEffect, useMemo, useState } from 'react';
import { searchAliases } from '@/lib/search/alias-search';
import { searchDevTools } from '@/lib/search/dev-tool-search';
import { searchSnippets } from '@/lib/search/snippet-search';
import { getAliases } from '@/lib/storage/aliases';
import { getSnippets } from '@/lib/storage/snippets';
import type { CommandItem } from '@/types';
import type { UrlAlias } from '@/types';
import type { TextSnippet } from '@/types';

export function useFlickSearch() {
  const [aliases, setAliases] = useState<UrlAlias[]>([]);
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getAliases(), getSnippets()]).then(([loadedAliases, loadedSnippets]) => {
      if (!cancelled) {
        setAliases(loadedAliases);
        setSnippets(loadedSnippets);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const aliasResults: CommandItem[] = useMemo(
    () => searchAliases(aliases, query),
    [aliases, query],
  );

  const devToolResults: CommandItem[] = useMemo(
    () => searchDevTools(query),
    [query],
  );

  const snippetResults: CommandItem[] = useMemo(
    () => searchSnippets(snippets, query),
    [snippets, query],
  );

  const results: CommandItem[] = useMemo(
    () => [...aliasResults, ...snippetResults, ...devToolResults],
    [aliasResults, snippetResults, devToolResults],
  );

  return {
    query,
    setQuery,
    results,
    aliasResults,
    devToolResults,
    snippetResults,
    aliases,
    snippets,
    loading,
  };
}
