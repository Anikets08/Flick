/**
 * A list of items in `chrome.storage.sync`, stored one key per item
 * (`alias:<id>`) instead of one array under a single key.
 *
 * Sync storage allows only 8 KB per key but ~100 KB in total, so a single
 * array key capped users at a few dozen shortcuts. Per-item keys give each
 * item its own 8 KB and let the collection use the whole sync quota.
 */

interface Identifiable {
  id: string;
}

type Stored<T> = T & { order: number };

export interface SyncCollection<T extends Identifiable> {
  getAll(): Promise<T[]>;
  saveAll(items: T[]): Promise<void>;
}

export function createSyncCollection<T extends Identifiable>(options: {
  /** Key prefix, e.g. `alias` → `alias:<id>`. */
  prefix: string;
  /** Pre-1.0 storage key that held the whole array; migrated on first read. */
  legacyKey: string;
}): SyncCollection<T> {
  const keyPrefix = `${options.prefix}:`;
  const keyFor = (item: T) => `${keyPrefix}${item.id}`;

  const readStored = async (): Promise<Record<string, Stored<T>>> => {
    const all = await browser.storage.sync.get(null);
    const stored: Record<string, Stored<T>> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(keyPrefix)) stored[key] = value as Stored<T>;
    }
    return stored;
  };

  const write = async (items: T[], existing: Record<string, Stored<T>>): Promise<void> => {
    const next: Record<string, Stored<T>> = {};
    items.forEach((item, order) => {
      next[keyFor(item)] = { ...item, order };
    });

    // Only write keys that changed — sync storage also limits writes per minute.
    const changed = Object.fromEntries(
      Object.entries(next).filter(([key, value]) => JSON.stringify(existing[key]) !== JSON.stringify(value)),
    );
    const removed = Object.keys(existing).filter((key) => !(key in next));

    // Set before remove: if the set hits the quota, nothing has been deleted.
    if (Object.keys(changed).length) await browser.storage.sync.set(changed);
    if (removed.length) await browser.storage.sync.remove(removed);
  };

  const migrateLegacy = async (): Promise<boolean> => {
    const { [options.legacyKey]: legacy } = await browser.storage.sync.get(options.legacyKey);
    if (legacy === undefined) return false;
    if (Array.isArray(legacy)) await write(legacy as T[], await readStored());
    await browser.storage.sync.remove(options.legacyKey);
    return true;
  };

  return {
    async getAll() {
      await migrateLegacy();
      return Object.values(await readStored())
        .sort((a, b) => a.order - b.order)
        .map(({ order: _order, ...item }) => item as unknown as T);
    },

    async saveAll(items) {
      await write(items, await readStored());
    },
  };
}
