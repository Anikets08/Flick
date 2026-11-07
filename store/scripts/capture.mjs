// Captures raw demo screenshots of the real extension (E2E build) into
// store/raw/. Run from the repo root after `FLICK_E2E=1 npx wxt build`:
//   node store/scripts/capture.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launchDemo } from './demo-browser.mjs';

const OUT = path.resolve('store/raw');
fs.mkdirSync(OUT, { recursive: true });

const { context, sw, page, input, open, run } = await launchDemo({ scale: Number(process.env.SCALE ?? 2) });

const boxes = {};
async function shot(name, query) {
  await open();
  if (query) {
    await input().pressSequentially(query, { delay: 20 });
    await page.waitForTimeout(500); // bookmarks arrive after the typing pause
  }
  await page.mouse.move(5, 795);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  boxes[name] = await input().evaluate((el) => {
    const r = el.closest('.rounded-xl').getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

// Build up "Recent" naturally, in reverse of how it should read.
await run('grid', 'Toggle Column Grid');
await run('grid', 'Toggle Column Grid');
await run('md', 'Copy as Markdown Link');
await run('email', 'email');
await run('ss', 'Screenshot — Current Tab');
await page.waitForTimeout(2500); // let the toast fade

await shot('01-home');
await shot('02-roadmap', 'roadmap');
await shot('02b-design', 'design');
await shot('03-template', 'yt lofi beats');
await shot('04-pr', 'pr 482');
await shot('05-dark', 'dark');
await shot('06-snippet', 'email');
await shot('07-copy', 'copy');

// Page tools in action.
await run('dark', 'Toggle Dark Mode');
await page.waitForTimeout(2200);
await page.screenshot({ path: path.join(OUT, '10-dark-applied.png') });
await run('dark', 'Toggle Dark Mode');
await run('grid', 'Toggle Column Grid');
await run('ruler', 'Toggle Pixel Rulers');
await page.waitForTimeout(2200);
await page.screenshot({ path: path.join(OUT, '11-grid-rulers.png') });
await run('grid', 'Toggle Column Grid');
await run('ruler', 'Toggle Pixel Rulers');
await page.waitForTimeout(2200);
await run('color', 'Color Picker');
await page.waitForTimeout(1200);
await page.mouse.move(80, 470, { steps: 8 });
await page.mouse.move(90, 448, { steps: 4 });
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, '12-color-picker.png') });
await page.keyboard.press('Escape');

// Settings.
const extId = new URL(sw.url()).host;
const opts = await context.newPage();
await opts.goto(`chrome-extension://${extId}/options.html`);
await opts.waitForTimeout(800);
await opts.screenshot({ path: path.join(OUT, '20-settings.png') });

fs.writeFileSync(path.join(OUT, 'boxes.json'), JSON.stringify(boxes, null, 2));
await context.close();
console.log('raw captures in', OUT);
