import { expect, openPalette, paletteRow, syncItems, test } from './fixtures';
import type { BrowserContext } from '@playwright/test';

async function openOptions(context: BrowserContext, extensionId: string) {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options.getByRole('button', { name: /New shortcut/ })).toBeVisible();
  return options;
}


test('add, disable, and delete a shortcut', async ({ context, extensionId, sw, page }) => {
  const options = await openOptions(context, extensionId);

  await options.getByRole('button', { name: /New shortcut/ }).click();
  const dialog = options.getByRole('dialog', { name: 'New shortcut' });
  await dialog.getByPlaceholder('e.g. backend-pull').fill('docs');
  await dialog.getByPlaceholder('https://www.youtube.com').fill('https://docs.test/');
  await dialog.getByRole('button', { name: 'Add shortcut' }).click();
  await expect(dialog).toHaveCount(0);

  await expect
    .poll(async () => (await syncItems(sw, 'alias')).some((a) => a.trigger === 'docs'))
    .toBe(true);

  // The new shortcut is searchable from the palette.
  const input = await openPalette(sw, page);
  await input.fill('docs');
  await expect(paletteRow(page, 'docs').first()).toBeVisible();
  await page.keyboard.press('Escape');

  await options.getByRole('switch', { name: 'Enable docs' }).click();
  await expect
    .poll(async () => (await syncItems(sw, 'alias')).find((a) => a.trigger === 'docs')?.enabled)
    .toBe(false);

  await options.getByRole('button', { name: 'Delete docs' }).click();
  await expect
    .poll(async () => (await syncItems(sw, 'alias')).some((a) => a.trigger === 'docs'))
    .toBe(false);
});

test('add a snippet', async ({ context, extensionId, sw }) => {
  const options = await openOptions(context, extensionId);
  await options.getByRole('button', { name: 'Snippets' }).click();
  await options.getByRole('button', { name: /New snippet/ }).click();
  const dialog = options.getByRole('dialog', { name: 'New snippet' });
  await dialog.getByPlaceholder('e.g. email').fill('addr');
  await dialog.getByPlaceholder('Text to copy to clipboard').fill('1 Infinite Loop');
  await dialog.getByRole('button', { name: 'Add snippet' }).click();

  await expect
    .poll(async () => (await syncItems(sw, 'snippet')).map((s) => s.trigger))
    .toEqual(['addr']);
});

test('shows an error instead of silently losing data when sync storage is full', async ({ context, extensionId, sw }) => {
  const options = await openOptions(context, extensionId);
  await options.getByRole('button', { name: 'Snippets' }).click();
  await options.getByRole('button', { name: /New snippet/ }).click();
  const dialog = options.getByRole('dialog', { name: 'New snippet' });
  await dialog.getByPlaceholder('e.g. email').fill('huge');
  await dialog.getByPlaceholder('Text to copy to clipboard').fill('x'.repeat(9000));
  await dialog.getByRole('button', { name: 'Add snippet' }).click();

  await expect(options.getByText(/sync storage is full/)).toBeVisible();
  await expect(options.getByText('huge', { exact: true })).toHaveCount(0);
  expect(await syncItems(sw, 'snippet')).toEqual([]);
});

test('export and re-import shortcuts', async ({ context, extensionId, sw }) => {
  const options = await openOptions(context, extensionId);

  const [download] = await Promise.all([
    options.waitForEvent('download'),
    options.getByRole('button', { name: 'Export' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^flick-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString()));
  expect(exported.aliases.map((a: { id: string }) => a.id)).toContain('gh');

  const backup = {
    version: 1,
    aliases: [{ id: 'imported-1', trigger: 'imp', url: 'https://imported.test/' }],
    snippets: [],
  };
  await options.getByLabel('Import shortcuts from JSON file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(options.getByText('Imported 1 shortcut.')).toBeVisible();
  await expect
    .poll(async () => (await syncItems(sw, 'alias')).some((a) => a.id === 'imported-1'))
    .toBe(true);
});

test('features tab lists browser search with history off by default', async ({ context, extensionId }) => {
  const options = await openOptions(context, extensionId);
  await options.getByRole('button', { name: 'Features' }).click();
  await expect(options.getByText('Browser Search')).toBeVisible();
  await expect(options.getByRole('switch', { name: 'Search history' })).toHaveAttribute('aria-checked', 'false');
});

test('holds far more shortcuts than the old 8 KB single-key limit', async ({ context, extensionId, sw }) => {
  // ~200 bytes each: 80 of these is ~16 KB, double what one sync key can hold.
  const backup = {
    version: 1,
    aliases: Array.from({ length: 80 }, (_, i) => ({
      id: `bulk-${i}`,
      trigger: `bulk-${i}`,
      url: `https://bulk.test/some/reasonably/long/path/${i}`,
      description: `Bulk shortcut number ${i} for capacity testing`,
      keywords: ['bulk', 'capacity', 'test'],
    })),
    snippets: [],
  };
  const options = await openOptions(context, extensionId);
  await options.getByLabel('Import shortcuts from JSON file').setInputFiles({
    name: 'bulk.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(options.getByText('Imported 80 shortcuts.')).toBeVisible();
  expect((await syncItems(sw, 'alias')).length).toBe(80 + 4);
});

test('migrates shortcuts saved in the old single-key format', async ({ context, extensionId, sw, page }) => {
  await sw.evaluate(async () => {
    const all = await chrome.storage.sync.get(null);
    await chrome.storage.sync.remove(Object.keys(all));
    await chrome.storage.sync.set({
      aliases: [
        { id: 'old-1', trigger: 'legacy', url: 'https://legacy.test/' },
        { id: 'old-2', trigger: 'second', url: 'https://second.test/' },
      ],
    });
  });

  const input = await openPalette(sw, page);
  await input.fill('legacy');
  await expect(paletteRow(page, 'legacy').first()).toBeVisible();

  const keys = await sw.evaluate(async () => Object.keys(await chrome.storage.sync.get(null)).sort());
  expect(keys).toEqual(['alias:old-1', 'alias:old-2']);
  expect((await syncItems(sw, 'alias')).map((a) => a.trigger)).toEqual(['legacy', 'second']);

  // Settings shows them in their original order.
  const options = await openOptions(context, extensionId);
  await expect(options.getByRole('switch', { name: 'Enable legacy' })).toBeVisible();
  await expect(options.getByRole('switch', { name: 'Enable second' })).toBeVisible();
});
