import type { CommandItem } from '@/types';

const RECENTS_KEY = 'recents';
const MAX_RECENTS = 10;

// Device-local on purpose: recents churn on every use and would burn through
// the sync write quota.
export async function getRecents(): Promise<CommandItem[]> {
  const { recents } = await browser.storage.local.get(RECENTS_KEY);
  return Array.isArray(recents) ? (recents as CommandItem[]) : [];
}

export async function recordRecent(item: CommandItem): Promise<void> {
  // Tab ids don't survive a browser restart, so switching tabs isn't worth
  // remembering.
  if (item.category === 'tab') return;

  const { score: _score, ...entry } = item;
  const existing = await getRecents();
  const next = [entry, ...existing.filter((recent) => recent.id !== item.id)].slice(0, MAX_RECENTS);
  await browser.storage.local.set({ [RECENTS_KEY]: next });
}
