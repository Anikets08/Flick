import type { TextSnippet } from '@/types';
import { createSyncCollection } from './sync-collection';

const snippetStore = createSyncCollection<TextSnippet>({ prefix: 'snippet', legacyKey: 'snippets' });

export async function getAllSnippets(): Promise<TextSnippet[]> {
  return snippetStore.getAll();
}

export async function getSnippets(): Promise<TextSnippet[]> {
  const all = await getAllSnippets();
  return all.filter((s) => s.enabled !== false);
}

export async function saveSnippets(snippets: TextSnippet[]): Promise<void> {
  await snippetStore.saveAll(snippets);
}
