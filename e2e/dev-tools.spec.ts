import { expect, runCommand, tabs, test } from './fixtures';
import type { Page, Worker } from '@playwright/test';

async function currentTab(sw: Worker, page: Page) {
  return (await tabs(sw)).find((t) => t.url === page.url())!;
}

// Playwright stores downloads under random names, so match on type instead.
function pngDownloads(sw: Worker) {
  return sw.evaluate(() => chrome.downloads.search({ mime: 'image/png' }));
}

test('toggle dark mode', async ({ sw, page }) => {
  await runCommand(sw, page, 'dark', 'Toggle Dark Mode');
  await expect(page.locator('#flick-dark-mode')).toHaveCount(1);
  await expect(page.getByText('Dark mode on')).toBeVisible();
  await runCommand(sw, page, 'dark', 'Toggle Dark Mode');
  await expect(page.locator('#flick-dark-mode')).toHaveCount(0);
});

test('toggle grid and rulers', async ({ sw, page }) => {
  await runCommand(sw, page, 'grid', 'Toggle Column Grid');
  await expect(page.locator('#flick-grid-overlay')).toHaveCount(1);
  await runCommand(sw, page, 'ruler', 'Toggle Pixel Rulers');
  await expect(page.locator('#flick-rulers')).toHaveCount(1);
});

test('copy URL and Markdown link', async ({ sw, page }) => {
  await runCommand(sw, page, 'copy url', 'Copy URL');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
  await runCommand(sw, page, 'markdown', 'Copy as Markdown Link');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`[Home](${page.url()})`);
});

test('duplicate, pin, and mute the tab', async ({ sw, page }) => {
  await runCommand(sw, page, 'duplicate', 'Duplicate Tab');
  await expect.poll(async () => (await tabs(sw)).filter((t) => t.url === page.url()).length).toBe(2);

  await page.bringToFront();
  await runCommand(sw, page, 'pin', 'Toggle Pin Tab');
  await expect.poll(async () => (await currentTab(sw, page)).pinned).toBe(true);

  await runCommand(sw, page, 'mute', 'Toggle Mute Tab');
  await expect.poll(async () => (await currentTab(sw, page)).mutedInfo?.muted).toBe(true);
});

test('move the tab to a new window', async ({ context, sw, page }) => {
  await context.newPage(); // so the original window survives the move
  await page.bringToFront();
  await runCommand(sw, page, 'new window', 'Move to New Window');
  await expect.poll(() => sw.evaluate(async () => (await chrome.windows.getAll()).length)).toBe(2);
});

test('move to new window explains when the tab is already alone', async ({ sw, page }) => {
  await runCommand(sw, page, 'new window', 'Move to New Window');
  await expect(page.getByText('This tab is already in its own window')).toBeVisible();
  expect(await sw.evaluate(async () => (await chrome.windows.getAll()).length)).toBe(1);
});

test('bookmark the page', async ({ sw, page }) => {
  await runCommand(sw, page, 'bookmark', 'Bookmark Page');
  await expect
    .poll(() => sw.evaluate((url) => chrome.bookmarks.search({ url }).then((r) => r.length), page.url()))
    .toBe(1);
});

test('screenshot the visible tab', async ({ sw, page }) => {
  await runCommand(sw, page, 'screenshot current', 'Screenshot — Current Tab');
  await expect.poll(async () => (await pngDownloads(sw)).length).toBe(1);
});

test('screenshot a selected element', async ({ sw, page }) => {
  await runCommand(sw, page, 'element', 'Screenshot — Select Element');
  await expect(page.locator('#flick-element-highlight')).toHaveCount(1);
  await page.locator('#swatch').click();
  await expect.poll(async () => (await pngDownloads(sw)).length).toBe(1);
});

test('color picker copies the clicked pixel', async ({ sw, page }) => {
  await runCommand(sw, page, 'color', 'Color Picker');
  await expect(page.locator('#flick-picker-cursor')).toHaveCount(1);
  // The live preview appears on mouse move once the page capture is ready.
  await expect(async () => {
    await page.mouse.move(150 + Math.random() * 10, 250);
    await expect(page.locator('#flick-picker-tooltip')).toContainText('#ff0000', { timeout: 200 });
  }).toPass();
  await page.mouse.click(160, 260);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('#ff0000');
  await expect(page.locator('#flick-picker-cursor')).toHaveCount(0);
});

test('clear cache reloads the current site', async ({ sw, page }) => {
  await page.evaluate(() => ((window as any).__beforeReload = true));
  await runCommand(sw, page, 'clear cache', 'Clear Cache');
  await expect
    .poll(() => page.evaluate(() => (window as any).__beforeReload ?? false).catch(() => 'reloading'))
    .toBe(false);
});
