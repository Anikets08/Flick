import type { UrlAlias } from '@/types';

const ALIASES_KEY = 'aliases';

export async function getAllAliases(): Promise<UrlAlias[]> {
  const { aliases } = await browser.storage.sync.get(ALIASES_KEY);
  const stored = aliases as UrlAlias[] | undefined;
  return stored ?? [];
}

export async function getAliases(): Promise<UrlAlias[]> {
  const all = await getAllAliases();
  return all.filter((alias) => alias.enabled !== false);
}

export async function saveAliases(aliases: UrlAlias[]): Promise<void> {
  await browser.storage.sync.set({ [ALIASES_KEY]: aliases });
}
