import Fuse from 'fuse.js';
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

export function searchSnippets(snippets: TextSnippet[], query: string): CommandItem[] {
  const enabled = snippets.filter((s) => s.enabled !== false);

  if (!query.trim()) {
    return enabled.map(snippetToCommandItem);
  }

  const normalized = query.trim().toLowerCase();
  const exact = enabled.find((s) => s.trigger.toLowerCase() === normalized);
  if (exact) {
    return [snippetToCommandItem(exact)];
  }

  const fuse = new Fuse(enabled, {
    keys: [
      { name: 'trigger', weight: 0.5 },
      { name: 'label', weight: 0.25 },
      { name: 'text', weight: 0.15 },
      { name: 'keywords', weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  });

  return fuse.search(query.trim()).map((result) => ({
    ...snippetToCommandItem(result.item),
    score: result.score,
  }));
}
