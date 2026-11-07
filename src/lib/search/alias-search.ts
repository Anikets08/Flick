import { rankItems, type SearchOptions } from '@/lib/search/rank';
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

const TEMPLATE_PLACEHOLDER = '{variable}';

function findTemplateMatch(aliases: UrlAlias[], query: string): { alias: UrlAlias; argument: string } | null {
  const trimmed = query.trim();
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return null;

  const templateAliases = aliases.filter((a) => a.enabled !== false && a.urlTemplate);

  for (let i = tokens.length - 1; i >= 1; i--) {
    const candidateTrigger = tokens.slice(0, i).join('-').toLowerCase();
    const matchingAlias = templateAliases.find(
      (a) => normalizeTrigger(a.trigger) === candidateTrigger,
    );
    if (matchingAlias) {
      const argument = tokens.slice(i).join(' ').trim();
      if (!argument) continue;
      return { alias: matchingAlias, argument };
    }
  }

  return null;
}

export function searchAliases(aliases: UrlAlias[], query: string, options: SearchOptions = {}): CommandItem[] {
  const enabled = aliases.filter((alias) => alias.enabled !== false);

  if (!query.trim()) {
    return enabled.map(aliasToCommandItem);
  }

  const templateMatch = findTemplateMatch(enabled, query);
  if (templateMatch) {
    const { alias, argument } = templateMatch;
    const resolvedUrl = alias.urlTemplate!.replaceAll(TEMPLATE_PLACEHOLDER, encodeURIComponent(argument));
    return [aliasToCommandItem({ ...alias, url: resolvedUrl })];
  }

  const normalizedQuery = normalizeTrigger(query);
  const exact = enabled.find((alias) => normalizeTrigger(alias.trigger) === normalizedQuery);
  if (exact) {
    return [aliasToCommandItem(exact)];
  }

  return rankItems(
    enabled,
    query,
    (alias) => [
      { value: alias.trigger, weight: 1 },
      { value: alias.keywords, weight: 0.85 },
      { value: alias.description, weight: 0.75 },
      { value: alias.url, weight: 0.5, substring: true },
    ],
    options,
  ).map(({ item, score }) => ({ ...aliasToCommandItem(item), score }));
}
