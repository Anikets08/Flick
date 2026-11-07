// Records the promo video's live demo with the real extension, then adds
// title cards and captions with ffmpeg. Output: store/video/flick-promo.mp4
//   FLICK_E2E=1 npx wxt build && node store/scripts/video.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { launchDemo } from './demo-browser.mjs';

const OUT = path.resolve('store/video');
const TMP = path.join(OUT, '.tmp');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const W = 1280;
const H = 720;

// ── 1. Record the demo ────────────────────────────────────────────────
const demo = await launchDemo({ viewport: { width: W, height: H }, scale: 1, recordVideo: { dir: TMP, size: { width: W, height: H } } });
const { context, page, input, open } = demo;
const t0 = Date.now();
const captions = []; // [text, start, end] in seconds of the recording
let captionStart = 0;
const caption = (text) => {
  const now = (Date.now() - t0) / 1000;
  if (captions.length) captions[captions.length - 1][2] = now;
  captions.push([text, now, null]);
  captionStart = now;
};
const wait = (ms) => page.waitForTimeout(ms);
const type = (text) => input().pressSequentially(text, { delay: 85 });

// A visible cursor: headless recordings don't draw the real one.
await page.evaluate(() => {
  const c = document.createElement('div');
  c.id = '__cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8-6.5 1.5L9 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 2147483647, pointerEvents: 'none', transition: 'none' });
  document.documentElement.append(c);
  addEventListener('mousemove', (e) => Object.assign(c.style, { left: `${e.clientX - 4}px`, top: `${e.clientY - 3}px` }), true);
});

await wait(900);

caption('Press ⌘⇧K on any page');
await open();
await wait(1400);

caption('Find any open tab or bookmark');
await type('roadmap');
await wait(1700);
await page.keyboard.press('Escape');
await wait(350);

caption('Your own shortcuts — with search built in');
await open();
await type('yt lofi beats');
await wait(1300);
await input().fill('');
await type('pr 482');
await wait(1300);
await page.keyboard.press('Escape');
await wait(350);

caption('Dark mode for any site');
await open();
await type('dark');
await wait(500);
await page.keyboard.press('Enter');
await wait(1700);
await open();
await type('dark');
await wait(300);
await page.keyboard.press('Enter');
await wait(500);

caption('Grids and pixel rulers for design checks');
await open();
await type('grid');
await wait(400);
await page.keyboard.press('Enter');
await wait(500);
await open();
await type('ruler');
await wait(400);
await page.keyboard.press('Enter');
await wait(1600);
for (const q of ['grid', 'ruler']) {
  await open();
  await input().fill(q);
  await page.keyboard.press('Enter');
  await wait(250);
}

caption('Pick any color on the page');
await open();
await type('color');
await wait(400);
await page.keyboard.press('Enter');
await wait(900);
await page.mouse.move(700, 600);
await page.mouse.move(120, 462, { steps: 30 });
await wait(1000);
await page.mouse.click(120, 462);
await wait(1600);
await page.evaluate(() => document.getElementById('__cursor')?.remove());

caption('Paste saved text in two keystrokes');
await open();
await type('email');
await wait(600);
await page.keyboard.press('Enter');
await wait(1700);

captions[captions.length - 1][2] = (Date.now() - t0) / 1000;
const video = page.video();
await context.close();
const recording = await video.path();

// ── 2. Title cards and caption overlays ───────────────────────────────
const icon = pathToFileURL(path.resolve('public/icon/128.png')).href;
const FONT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,700;9..40,800&display=block');
  *{margin:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;width:${W}px;height:${H}px;overflow:hidden;-webkit-font-smoothing:antialiased}`;
const CARD_BG = `background:radial-gradient(700px 420px at 50% -8%,rgba(61,139,255,.38),transparent 70%),radial-gradient(600px 400px at 100% 100%,rgba(124,92,255,.2),transparent 70%),#07090e;color:#f5f7fa`;
const KBD = (k) => `<span style="display:inline-grid;place-items:center;min-width:64px;height:64px;padding:0 16px;border-radius:15px;font:700 30px 'DM Sans';background:linear-gradient(#1d2230,#11141c);border:1px solid rgba(255,255,255,.14);box-shadow:0 4px 0 #05070b,0 14px 30px rgba(0,0,0,.45)">${k}</span>`;
const grad = 'background:linear-gradient(92deg,#fff 10%,#9cc4ff 60%,#b9a6ff);-webkit-background-clip:text;color:transparent';

const cards = {
  intro: `<div style="height:100%;display:grid;place-content:center;justify-items:center;gap:26px;${CARD_BG}">
    <div style="display:flex;align-items:center;gap:20px"><img src="${icon}" width="96" height="96" style="border-radius:22px"><span style="font-size:76px;font-weight:800;letter-spacing:-.04em">Flick</span></div>
    <div style="font-size:52px;font-weight:800;letter-spacing:-.03em;${grad}">Your browser, one shortcut away.</div></div>`,
  outro: `<div style="height:100%;display:grid;place-content:center;justify-items:center;gap:30px;${CARD_BG}">
    <div style="display:flex;align-items:center;gap:20px"><img src="${icon}" width="96" height="96" style="border-radius:22px"><span style="font-size:76px;font-weight:800;letter-spacing:-.04em">Flick</span></div>
    <div style="display:flex;gap:12px">${['⌘', '⇧', 'K'].map(KBD).join('')}</div>
    <div style="font-size:28px;color:#aab3c5">Free on the Chrome Web Store · No account · No tracking</div></div>`,
};
const pill = (text) => `<div style="position:absolute;left:0;right:0;bottom:104px;display:flex;justify-content:center">
  <div style="padding:16px 30px;border-radius:999px;background:rgba(10,12,18,.86);border:1px solid rgba(255,255,255,.14);color:#fff;font-size:30px;font-weight:700;letter-spacing:-.01em;box-shadow:0 18px 50px rgba(0,0,0,.45)">${text}</div></div>`;

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function png(file, body, transparent = false) {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  const html = path.join(TMP, 'render.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><style>${FONT}${transparent ? 'body{background:transparent}' : ''}</style></head><body>${body}</body></html>`);
  await p.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: file, omitBackground: transparent });
  await p.close();
}
await png(path.join(TMP, 'intro.png'), cards.intro);
await png(path.join(TMP, 'outro.png'), cards.outro);
for (const [i, [text]] of captions.entries()) await png(path.join(TMP, `cap${i}.png`), pill(text), true);
await browser.close();

// ── 3. Assemble ───────────────────────────────────────────────────────
const ff = (...args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30'];

const card = (name, seconds) =>
  ff('-loop', '1', '-t', String(seconds), '-i', path.join(TMP, `${name}.png`),
    '-vf', `fade=in:0:12,fade=out:st=${seconds - 0.4}:d=0.4`, ...ENC, path.join(TMP, `${name}.mp4`));
card('intro', 2.6);
card('outro', 3.2);

const inputs = ['-i', recording];
let chain = '[0:v]fps=30[v0]';
captions.forEach(([, start, end], i) => {
  inputs.push('-i', path.join(TMP, `cap${i}.png`));
  chain += `;[v${i}][${i + 1}:v]overlay=0:0:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[v${i + 1}]`;
});
ff(...inputs, '-filter_complex', chain, '-map', `[v${captions.length}]`, ...ENC, path.join(TMP, 'demo.mp4'));

fs.writeFileSync(path.join(TMP, 'list.txt'), ['intro', 'demo', 'outro'].map((n) => `file '${path.join(TMP, `${n}.mp4`)}'`).join('\n'));
ff('-f', 'concat', '-safe', '0', '-i', path.join(TMP, 'list.txt'), ...ENC, path.join(OUT, 'flick-promo.mp4'));
fs.rmSync(TMP, { recursive: true, force: true });
console.log('video:', path.join(OUT, 'flick-promo.mp4'));
