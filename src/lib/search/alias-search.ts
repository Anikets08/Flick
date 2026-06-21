import Fuse from 'fuse.js';
import type { CommandItem } from '@/types';
import type { UrlAlias } from '@/types';

function normalizeTrigger(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function aliasToCommandItem(alias: UrlAlias): CommandItem {
  return {
    id: alias.id,
    title: alias.trigger,
    subtitle: alias.description ?? alias.url,
    keywords: alias.keywords,
    category: 'alias',
    action: {
      type: 'navigate',
      url: alias.url,
      newTab: alias.newTab,
    },
  };
}

export function searchAliases(aliases: UrlAlias[], query: string): CommandItem[] {
  const enabled = aliases.filter((alias) => alias.enabled !== false);

  if (!query.trim()) {
    return enabled.map(aliasToCommandItem);
  }

  const normalizedQuery = normalizeTrigger(query);
  const exact = enabled.find((alias) => normalizeTrigger(alias.trigger) === normalizedQuery);
  if (exact) {
    return [aliasToCommandItem(exact)];
  }

  const fuse = new Fuse(enabled, {
    keys: [
      { name: 'trigger', weight: 0.5 },
      { name: 'description', weight: 0.25 },
      { name: 'keywords', weight: 0.25 },
      { name: 'url', weight: 0.1 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
  });

  return fuse.search(query.trim()).map((result) => ({
    ...aliasToCommandItem(result.item),
    score: result.score,
  }));
}
