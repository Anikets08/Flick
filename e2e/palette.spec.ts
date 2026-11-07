import { expect, openPalette, paletteInput, paletteRow, runCommand, tabs, test, togglePalette } from './fixtures';

test('opens with default groups, closes on Escape, and reopens', async ({ sw, page }) => {
  await openPalette(sw, page);
  await expect(page.getByText('Shortcuts', { exact: true })).toBeVisible();
  await expect(page.getByText('Tools', { exact: true })).toBeVisible();
  await expect(paletteRow(page, 'gh')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(paletteInput(page)).toHaveCount(0);

  await openPalette(sw, page);
  await togglePalette(sw, page);
  await expect(paletteInput(page)).toHaveCount(0);
});

test('search results are ordered Shortcuts, Tools, then the rest', async ({ context, sw, page }) => {
  const other = await context.newPage();
  await other.goto('https://copy.test/?title=Copy%20Editor');
  await sw.evaluate(() =>
    chrome.storage.sync.set({ 'alias:copydeck': { id: 'copydeck', trigger: 'copydeck', url: 'https://deck.test/', order: 99 } }),
  );

  const input = await openPalette(sw, page);
  await input.fill('copy');
  await expect(page.getByText('Open Tabs', { exact: true })).toBeVisible();
  const headings = await page.locator('[data-group-heading]').allTextContents();
  expect(headings.slice(0, 3)).toEqual(['Shortcuts', 'Tools', 'Open Tabs']);
});

test('"dark" puts Toggle Dark Mode first, not a fuzzy shortcut match', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('dark');
  await expect(page.locator('[role="option"]').first()).toContainText('Toggle Dark Mode');
  await expect(page.locator('[role="option"]').first()).toHaveAttribute('aria-selected', 'true');
  await expect(paletteRow(page, /^cal/)).toHaveCount(0);
});

test('typos still find tools when nothing matches directly', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('screnshot');
  await expect(page.locator('[role="option"]').first()).toContainText('Screenshot');
});

test('a closed palette leaves the page fully clickable', async ({ sw, page }) => {
  await openPalette(sw, page);
  await page.keyboard.press('Escape');
  await expect(paletteInput(page)).toHaveCount(0);
  // The host stays mounted for instant reopening; it must not cover anything.
  const topElement = await page.evaluate(() => document.elementFromPoint(200, 260)?.id);
  expect(topElement).toBe('swatch');
});

test('reopening is instant and starts with an empty query', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('dark');
  await page.keyboard.press('Escape');
  await togglePalette(sw, page);
  // Data is already in memory, so results render without a loading state.
  await expect(paletteInput(page)).toHaveValue('');
  await expect(page.getByText('Loading shortcuts…')).toHaveCount(0);
  await expect(page.locator('[role="option"]').first()).toBeVisible();
});

test('arrow keys and Ctrl+N/P move the selection', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('copy');
  const options = page.locator('[role="option"]');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await input.press('Control+n');
  await expect(options.nth(2)).toHaveAttribute('aria-selected', 'true');
  await input.press('Control+p');
  await input.press('ArrowUp');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowUp'); // stays at the top
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveAttribute('aria-activedescendant', (await options.first().getAttribute('id'))!);
});

test('new shortcuts appear without reopening the page', async ({ sw, page }) => {
  await openPalette(sw, page);
  await page.keyboard.press('Escape');
  await sw.evaluate(() =>
    chrome.storage.sync.set({ 'alias:fresh': { id: 'fresh', trigger: 'freshly', url: 'https://fresh.test/', order: 50 } }),
  );
  const input = await openPalette(sw, page);
  await input.fill('freshly');
  await expect(paletteRow(page, /^freshly/)).toBeVisible();
});

test('closes when clicking the backdrop', async ({ sw, page }) => {
  await openPalette(sw, page);
  await page.mouse.click(20, 780);
  await expect(paletteInput(page)).toHaveCount(0);
});

test('keeps keystrokes away from the page while open', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.pressSequentially('abc');
  await expect(input).toHaveValue('abc');
  expect(await page.evaluate(() => (window as any).__keys)).toBe(0);

  await page.keyboard.press('Escape');
  await expect(paletteInput(page)).toHaveCount(0);
  await page.keyboard.press('x');
  expect(await page.evaluate(() => (window as any).__keys)).toBeGreaterThan(0);
});

test('Enter on an exact shortcut opens it in a new tab', async ({ context, sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('gh');
  await expect(paletteRow(page, 'gh').first()).toHaveAttribute('aria-selected', 'true');
  const [newPage] = await Promise.all([context.waitForEvent('page'), input.press('Enter')]);
  await expect(newPage).toHaveURL('https://github.com/');
});

test('URL template fills {variable} from the query', async ({ context, sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('yt tony stark');
  await expect(paletteRow(page, 'YouTube')).toHaveAttribute('aria-selected', 'true');
  const [newPage] = await Promise.all([context.waitForEvent('page'), input.press('Enter')]);
  await expect(newPage).toHaveURL('https://www.youtube.com/results?search_query=tony%20stark');
});

test('falls back to a Google search', async ({ sw, page }) => {
  const input = await openPalette(sw, page);
  await input.fill('qwzx unmatched');
  const google = paletteRow(page, /Search Google for/);
  await expect(google).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await page.waitForURL('https://www.google.com/search?q=qwzx%20unmatched');
});

test('finds and switches to an open tab', async ({ context, sw, page }) => {
  const other = await context.newPage();
  await other.goto('https://board.test/?title=Unique%20Kanban%20Board');

  const input = await openPalette(sw, page);
  await input.fill('kanban');
  const row = paletteRow(page, 'Unique Kanban Board');
  // Async results must take the selection from the Google fallback.
  await expect(row).toHaveAttribute('aria-selected', 'true');
  await expect(paletteRow(page, 'Home')).toHaveCount(0); // current tab is excluded
  await input.press('Enter');

  await expect
    .poll(async () => (await tabs(sw)).find((t) => t.active)?.url)
    .toBe('https://board.test/?title=Unique%20Kanban%20Board');
});

test('finds bookmarks and opens them in the current tab', async ({ sw, page }) => {
  await sw.evaluate(() => chrome.bookmarks.create({ title: 'Zebra Docs', url: 'https://zebra.test/docs' }));
  await runCommand(sw, page, 'zebra', 'Zebra Docs');
  await page.waitForURL('https://zebra.test/docs');
});

test('history is not searched until the permission is granted', async ({ sw, page }) => {
  expect(await sw.evaluate(() => chrome.permissions.contains({ permissions: ['history'] }))).toBe(false);
  const input = await openPalette(sw, page);
  await input.fill('home');
  await expect(paletteRow(page, /Search Google/)).toBeVisible();
  await expect(page.getByText('History', { exact: true })).toHaveCount(0);
});

test('remembers recently used commands', async ({ context, sw, page }) => {
  await Promise.all([context.waitForEvent('page'), runCommand(sw, page, 'mdn', 'mdn')]);
  await openPalette(sw, page);
  await expect(page.getByText('Recent', { exact: true })).toBeVisible();
  await expect(paletteRow(page, 'mdn').first()).toBeVisible();
});

test('snippets copy their text to the clipboard', async ({ sw, page }) => {
  await sw.evaluate(() =>
    chrome.storage.sync.set({
      'snippet:s1': { id: 's1', trigger: 'sig', text: 'Cheers,\nAniket', label: 'Signature', order: 0 },
    }),
  );
  await runCommand(sw, page, 'sig', 'Signature');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('Cheers,\nAniket');
  await expect(page.getByText('Signature copied to clipboard')).toBeVisible();
});

test('disabled shortcuts are hidden', async ({ sw, page }) => {
  await sw.evaluate(async () => {
    const { 'alias:mdn': mdn } = await chrome.storage.sync.get('alias:mdn');
    await chrome.storage.sync.set({ 'alias:mdn': { ...(mdn as object), enabled: false } });
  });
  const input = await openPalette(sw, page);
  await input.fill('mdn');
  await expect(paletteRow(page, /^mdn/)).toHaveCount(0);
});

test('side panel renders the palette', async ({ context, extensionId }) => {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.locator('input[aria-label="Command search"]')).toBeVisible();
  await expect(panel.locator('[role="option"]').first()).toBeVisible();
});
