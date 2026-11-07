import type { UrlAlias } from '@/types';
import { createSyncCollection } from './sync-collection';

const aliasStore = createSyncCollection<UrlAlias>({ prefix: 'alias', legacyKey: 'aliases' });

export async function getAllAliases(): Promise<UrlAlias[]> {
  return aliasStore.getAll();
}

export async function getAliases(): Promise<UrlAlias[]> {
  const all = await getAllAliases();
  return all.filter((alias) => alias.enabled !== false);
}

export async function saveAliases(aliases: UrlAlias[]): Promise<void> {
  await aliasStore.saveAll(aliases);
}
