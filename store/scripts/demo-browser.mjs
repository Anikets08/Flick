// A Chromium profile running the E2E build of Flick, seeded with demo
// shortcuts, snippets, bookmarks and open tabs. Shared by capture.mjs and
// video.mjs. Build first: FLICK_E2E=1 npx wxt build
import path from 'node:path';
import { chromium } from '@playwright/test';
import { demoPage, TITLES } from './demo-pages.mjs';

const EXT = path.resolve('.output-e2e/chrome-mv3');

const ALIASES = [
  { id: 'gh', trigger: 'gh', url: 'https://github.com', description: 'GitHub', keywords: ['github', 'code', 'repo'], newTab: true },
  { id: 'yt', trigger: 'yt', url: 'https://www.youtube.com', urlTemplate: 'https://www.youtube.com/results?search_query={variable}', description: 'YouTube', keywords: ['video', 'watch', 'search'], newTab: true },
  { id: 'pr', trigger: 'pr', url: 'https://code.northwind.app/web/pulls', urlTemplate: 'https://code.northwind.app/web/pull/{variable}', description: 'Open a pull request by number', keywords: ['pull', 'review'], newTab: true },
  { id: 'cal', trigger: 'cal', url: 'https://calendar.google.com', description: 'Google Calendar', keywords: ['calendar', 'schedule'], newTab: true },
  { id: 'mdn', trigger: 'mdn', url: 'https://developer.mozilla.org', description: 'MDN Web Docs', keywords: ['docs', 'javascript', 'css'], newTab: true },
  { id: 'standup', trigger: 'standup', url: 'https://meet.northwind.app/standup', description: 'Daily standup call', keywords: ['meeting', 'call'], newTab: true },
];
const SNIPPETS = [
  { id: 'snippet-email', trigger: 'email', text: 'alex@northwind.app', label: 'Work email', keywords: ['mail', 'contact'] },
  { id: 'snippet-sig', trigger: 'sig', text: 'Best,\nAlex Rivera · Northwind', label: 'Email signature', keywords: ['signature', 'signoff'] },
  { id: 'snippet-addr', trigger: 'address', text: '500 Market St, San Francisco, CA', label: 'Office address', keywords: ['shipping', 'location'] },
  { id: 'snippet-zoom', trigger: 'meet', text: 'https://meet.northwind.app/alex', label: 'My meeting link', keywords: ['call', 'zoom'] },
];
const BOOKMARKS = [
  ['Roadmap planning template', 'https://northwind.app/templates/roadmap'],
  ['Product roadmap 2027 — draft', 'https://northwind.app/docs/roadmap-2027'],
  ['Brand guidelines 2026', 'https://northwind.app/brand'],
  ['Release checklist', 'https://northwind.app/docs/release'],
  ['CSS Grid — complete guide', 'https://css.example/grid'],
];

export async function launchDemo({ viewport = { width: 1280, height: 800 }, scale = 2, recordVideo } = {}) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: !process.env.HEADED,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
    viewport,
    deviceScaleFactor: scale,
    recordVideo,
  });
  await context.route(/^https?:\/\//, (route) =>
    route.fulfill({ contentType: 'text/html', body: demoPage(route.request().url()) }),
  );

  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await new Promise((r) => setTimeout(r, 1500)); // let onInstalled seed + open welcome
  for (const p of context.pages()) if (p.url().includes('welcome')) await p.close();

  await sw.evaluate(async ({ aliases, snippets, bookmarks }) => {
    await chrome.storage.sync.clear();
    const items = {};
    aliases.forEach((a, order) => (items[`alias:${a.id}`] = { ...a, order }));
    snippets.forEach((s, order) => (items[`snippet:${s.id}`] = { ...s, order }));
    await chrome.storage.sync.set(items);
    await chrome.storage.local.clear();
    for (const [title, url] of bookmarks) await chrome.bookmarks.create({ parentId: '1', title, url });
  }, { aliases: ALIASES, snippets: SNIPPETS, bookmarks: BOOKMARKS });

  for (const url of Object.keys(TITLES)) await (await context.newPage()).goto(url);

  // Opened last, so a recording of it starts with the demo, not the setup.
  const page = await context.newPage();
  await page.goto('https://northwind.app/');
  await page.bringToFront();

  const input = () => page.locator('input[aria-label="Command search"]');

  /** Same path as the keyboard shortcut: message the tab, injecting the palette on first use. */
  async function open() {
    await page.bringToFront();
    await sw.evaluate(async (url) => {
      const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'FLICK_TOGGLE' });
      } catch {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['/content-scripts/flick.js'] });
        await new Promise((r) => setTimeout(r, 80));
        await chrome.tabs.sendMessage(tab.id, { type: 'FLICK_TOGGLE' });
      }
    }, page.url());
    await input().waitFor();
    await page.getByText('Loading shortcuts…').waitFor({ state: 'detached' }).catch(() => {});
  }

  async function run(query, title) {
    await open();
    await input().fill(query);
    await page.locator('[role="option"]').filter({ hasText: title }).first().click();
    await input().waitFor({ state: 'detached' });
    await page.waitForTimeout(400);
  }

  return { context, sw, page, input, open, run };
}
