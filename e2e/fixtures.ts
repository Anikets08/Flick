import path from 'node:path';
import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test';

const EXTENSION_PATH = path.resolve(process.cwd(), '.output/chrome-mv3');

/**
 * Every http(s) request is answered locally, so tests never touch the network
 * and shortcuts like `gh` land on a predictable stub page. Pass `?title=` to
 * control the page title (used by open-tab search).
 */
function stubPage(url: string): string {
  const parsed = new URL(url);
  const title = parsed.searchParams.get('title') ?? `${parsed.hostname}${parsed.pathname}`;
  return `<!doctype html>
<html>
  <head><title>${title.replace(/</g, '&lt;')}</title></head>
  <body style="margin:0;font:16px sans-serif;background:#fff">
    <h1>${title.replace(/</g, '&lt;')}</h1>
    <div id="swatch" style="position:absolute;left:100px;top:200px;width:200px;height:120px;background:#ff0000"></div>
    <script>
      window.__keys = 0;
      window.addEventListener('keydown', () => { window.__keys++; });
    </script>
  </body>
</html>`;
}

type Fixtures = {
  context: BrowserContext;
  sw: Worker;
  extensionId: string;
  page: Page;
};

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
      permissions: ['clipboard-read', 'clipboard-write'],
      acceptDownloads: true,
      viewport: { width: 1280, height: 800 },
    });
    await context.route(/^https?:\/\//, (route) =>
      route.fulfill({ contentType: 'text/html', body: stubPage(route.request().url()) }),
    );
    await use(context);
    await context.close();
  },

  sw: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    // Wait for onInstalled to seed the default shortcuts.
    await expect
      .poll(async () => (await syncItems(sw, 'alias')).length)
      .toBeGreaterThan(0);
    await use(sw);
  },

  extensionId: async ({ sw }, use) => {
    await use(new URL(sw.url()).host);
  },

  page: async ({ context, sw: _sw }, use) => {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto('https://site.test/home?title=Home');
    await use(page);
  },
});

export { expect };

/** Same path as the keyboard shortcut: message the tab, injecting the palette on first use. */
export async function togglePalette(sw: Worker, page: Page): Promise<void> {
  await page.bringToFront();
  await sw.evaluate(async (url) => {
    const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
    if (!tab?.id) throw new Error(`No tab for ${url}`);
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'FLICK_TOGGLE' });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/content-scripts/flick.js'] });
      await new Promise((resolve) => setTimeout(resolve, 50));
      await chrome.tabs.sendMessage(tab.id, { type: 'FLICK_TOGGLE' });
    }
  }, page.url());
}

export function paletteInput(page: Page) {
  return page.locator('input[aria-label="Command search"]');
}

export async function openPalette(sw: Worker, page: Page) {
  await togglePalette(sw, page);
  const input = paletteInput(page);
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(page.getByText('Loading shortcuts…')).toHaveCount(0);
  return input;
}

/** Group heading + row inside the palette's shadow root. */
export function paletteRow(page: Page, title: string | RegExp) {
  return page.locator('[role="option"]').filter({ hasText: title });
}

/** Opens the palette, types `query`, waits for `rowTitle` to be the top pick, and presses Enter. */
export async function runCommand(sw: Worker, page: Page, query: string, rowTitle: string | RegExp) {
  const input = await openPalette(sw, page);
  await input.fill(query);
  const row = paletteRow(page, rowTitle).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(paletteInput(page)).toHaveCount(0);
}

/** Items of a per-key sync collection (`alias:<id>` / `snippet:<id>`), in saved order. */
export function syncItems<T = Record<string, any>>(sw: Worker, prefix: 'alias' | 'snippet'): Promise<T[]> {
  return sw.evaluate(async (p) => {
    const all = await chrome.storage.sync.get(null);
    return Object.entries(all)
      .filter(([key]) => key.startsWith(`${p}:`))
      .map(([, value]) => value as { order: number })
      .sort((a, b) => a.order - b.order);
  }, prefix) as Promise<T[]>;
}

export function tabs(sw: Worker) {
  return sw.evaluate(() => chrome.tabs.query({}));
}
