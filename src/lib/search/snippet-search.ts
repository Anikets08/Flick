import { rankItems, type SearchOptions } from '@/lib/search/rank';
import type { CommandItem } from '@/types';
import type { TextSnippet } from '@/types';

function snippetToCommandItem(snippet: TextSnippet): CommandItem {
  return {
    id: snippet.id,
    title: snippet.trigger,
    subtitle: snippet.label ?? snippet.text,
    keywords: snippet.keywords,
    category: 'snippet',
    action: {
      type: 'paste-snippet',
      text: snippet.text,
      label: snippet.label ?? snippet.trigger,
    },
  };
}

export function searchSnippets(snippets: TextSnippet[], query: string, options: SearchOptions = {}): CommandItem[] {
  const enabled = snippets.filter((s) => s.enabled !== false);

  if (!query.trim()) {
    return enabled.map(snippetToCommandItem);
  }

  const normalized = query.trim().toLowerCase();
  const exact = enabled.find((s) => s.trigger.toLowerCase() === normalized);
  if (exact) {
    return [snippetToCommandItem(exact)];
  }

  return rankItems(
    enabled,
    query,
    (snippet) => [
      { value: snippet.trigger, weight: 1 },
      { value: snippet.label, weight: 0.8 },
      { value: snippet.keywords, weight: 0.8 },
      { value: snippet.text, weight: 0.4 },
    ],
    options,
  ).map(({ item, score }) => ({ ...snippetToCommandItem(item), score }));
}
