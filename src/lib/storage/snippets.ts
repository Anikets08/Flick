import type { TextSnippet } from '@/types';

const SNIPPETS_KEY = 'snippets';

export async function getAllSnippets(): Promise<TextSnippet[]> {
  const { snippets } = await browser.storage.sync.get(SNIPPETS_KEY);
  const stored = snippets as TextSnippet[] | undefined;
  return stored ?? [];
}

export async function getSnippets(): Promise<TextSnippet[]> {
  const all = await getAllSnippets();
  return all.filter((s) => s.enabled !== false);
}

export async function saveSnippets(snippets: TextSnippet[]): Promise<void> {
  await browser.storage.sync.set({ [SNIPPETS_KEY]: snippets });
}
