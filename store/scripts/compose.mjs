// Composes Chrome Web Store graphics from the raw captures in store/raw/:
//   store/screenshots/*.png   1280×800
//   store/promo/*.png         440×280 small tile, 1400×560 marquee
// Run after capture.mjs:  node store/scripts/compose.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const RAW = path.resolve('store/raw');
const boxes = JSON.parse(fs.readFileSync(path.join(RAW, 'boxes.json'), 'utf8'));
const raw = (name) => pathToFileURL(path.join(RAW, `${name}.png`)).href;
const icon = pathToFileURL(path.resolve('public/icon/128.png')).href;

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@500&display=block');
  :root{--bg:#07090e;--text:#f5f7fa;--muted:#8b93a7;--accent:#3d8bff;--accent2:#7c5cff;--line:rgba(255,255,255,.08)}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%}
  body{font-family:'DM Sans',system-ui,sans-serif;color:var(--text);background:var(--bg);overflow:hidden;position:relative;-webkit-font-smoothing:antialiased}
  .glow{position:absolute;inset:0;background:
     radial-gradient(700px 420px at 50% -8%,rgba(61,139,255,.34),transparent 70%),
     radial-gradient(600px 400px at 100% 100%,rgba(124,92,255,.18),transparent 70%),
     radial-gradient(500px 360px at 0% 90%,rgba(61,139,255,.12),transparent 70%)}
  .dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:22px 22px;
     mask-image:linear-gradient(to bottom,#000 0,transparent 60%)}
  .eyebrow{font:600 14px/1 'DM Sans';letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
  h1{font-weight:800;letter-spacing:-.035em;line-height:1.04}
  .sub{color:var(--muted);font-size:21px;line-height:1.45}
  .grad{background:linear-gradient(92deg,#fff 10%,#9cc4ff 60%,#b9a6ff);-webkit-background-clip:text;color:transparent}
  kbd{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:44px;padding:0 12px;border-radius:11px;
     font:600 22px/1 'DM Sans';color:#fff;background:linear-gradient(#1d2230,#11141c);border:1px solid rgba(255,255,255,.14);
     box-shadow:0 3px 0 #05070b,0 10px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.1)}
  .keys{display:inline-flex;gap:8px;align-items:center}
  .window{position:absolute;border-radius:14px 14px 0 0;overflow:hidden;background:#0d1017;border:1px solid rgba(255,255,255,.12);border-bottom:0;
     box-shadow:0 40px 120px -20px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.4),0 -1px 0 rgba(255,255,255,.06)}
  .bar{height:40px;display:flex;align-items:center;gap:8px;padding:0 16px;background:#151924;border-bottom:1px solid var(--line)}
  .bar i{width:12px;height:12px;border-radius:50%;background:#2a3040}
  .bar i:nth-child(1){background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
  .url{margin-left:18px;flex:1;max-width:460px;height:26px;border-radius:8px;background:#0b0e15;color:#8b93a7;font-size:13px;display:flex;align-items:center;padding:0 12px}
  .shot{background-repeat:no-repeat}
  .crop{position:absolute;overflow:hidden;border-radius:14px;border:1px solid rgba(255,255,255,.14);
     box-shadow:0 30px 80px -10px rgba(0,0,0,.75),0 0 0 1px rgba(0,0,0,.5)}
  .pill{display:inline-flex;align-items:center;gap:10px;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);font-size:17px;color:#d5dbe7}
  .pill b{color:#fff}
  .mono{font-family:'JetBrains Mono',ui-monospace,monospace}
`;

/** A raw capture region shown at `scale` (CSS px of the 1280×800 capture). */
function region(name, { x = 0, y = 0, w = 1280, h = 800, scale = 1 }) {
  return `width:${w * scale}px;height:${h * scale}px;background-image:url('${raw(name)}');
    background-size:${1280 * scale}px ${800 * scale}px;background-position:${-x * scale}px ${-y * scale}px`;
}
function palette(name, scale) {
  const b = boxes[name];
  return region(name, { x: b.x, y: b.y, w: b.width, h: b.height, scale });
}
function browserWindow(name, { left, top, width, url = 'northwind.app', crop = {} }) {
  const scale = width / (crop.w ?? 1280);
  return `<div class="window" style="left:${left}px;top:${top}px;width:${width}px">
    <div class="bar"><i></i><i></i><i></i><div class="url">${url}</div></div>
    <div class="shot" style="${region(name, { ...crop, scale })}"></div></div>`;
}
const header = ({ eyebrow, title, sub, top = 64, align = 'center', width = 1000 }) => `
  <div style="position:absolute;top:${top}px;left:0;right:0;text-align:${align};display:grid;gap:16px;justify-items:${align === 'center' ? 'center' : 'start'};padding:0 ${align === 'center' ? 0 : 72}px">
    ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
    <h1 style="font-size:54px;max-width:${width}px">${title}</h1>
    ${sub ? `<p class="sub" style="max-width:760px">${sub}</p>` : ''}
  </div>`;

const SCREENS = {
  '01-command-palette': () => `
    <div class="glow"></div><div class="dots"></div>
    ${header({ title: '<span class="grad">Your browser, one shortcut away.</span>', sub: 'Press a shortcut on any page. Type a few letters. You\'re there.', top: 58 })}
    <div class="keys" style="position:absolute;left:0;right:0;top:196px;justify-content:center;display:flex"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>K</kbd></div>
    ${browserWindow('01-home', { left: 110, top: 268, width: 1060, crop: { x: 190, y: 80, w: 900, h: 460 } })}`,

  '02-tab-bookmark-search': () => `
    <div class="glow"></div><div class="dots"></div>
    ${header({ eyebrow: 'Search everything', title: 'Find any tab or bookmark<br>in a keystroke.', top: 56 })}
    ${browserWindow('02-roadmap', { left: 110, top: 268, width: 1060, url: 'northwind.app', crop: { x: 190, y: 80, w: 900, h: 460 } })}
    <div class="pill" style="position:absolute;right:46px;top:232px;transform:rotate(2deg)"><b>Open tabs</b> · <b>Bookmarks</b> · <b>History</b> · <b>Web</b></div>`,

  '03-shortcuts-snippets': () => `
    <div class="glow"></div><div class="dots"></div>
    ${header({ eyebrow: 'Shortcuts & snippets', title: 'Type less. Get there faster.', sub: 'Your own shortcuts, with search built in. Saved text, two keystrokes away.', top: 56 })}
    <div class="crop" style="left:96px;top:300px;${palette('03-template', 1.0)}"></div>
    <div class="crop" style="left:612px;top:420px;${palette('06-snippet', 1.0)}"></div>
    <div style="position:absolute;left:110px;top:600px;display:grid;gap:10px;font-size:18px;color:#c9d1e0">
      <div><span class="mono" style="color:#9cc4ff">yt lofi beats</span> → searches YouTube</div>
      <div><span class="mono" style="color:#9cc4ff">pr 482</span> → opens pull request #482</div>
      <div><span class="mono" style="color:#9cc4ff">email</span> → copies your email</div>
    </div>`,

  '04-page-tools': () => `
    <div class="glow"></div><div class="dots"></div>
    ${header({ eyebrow: '15 built-in tools', title: 'Dev & design tools, built in.', sub: 'Screenshot, pick colors, flip any site to dark mode, overlay grids and rulers — right from the palette.', top: 56 })}
    ${[
      ['10-dark-applied', 'Dark mode on any site', { x: 0, y: 0, w: 640, h: 472 }],
      ['11-grid-rulers', 'Column grid + pixel rulers', { x: 0, y: 0, w: 640, h: 472 }],
      ['12-color-picker', 'Pick any color → hex copied', { x: 20, y: 280, w: 420, h: 310 }],
    ].map(([name, label, crop], i) => `
      <div style="position:absolute;left:${64 + i * 392}px;top:330px;width:368px">
        <div class="crop" style="position:relative;${region(name, { ...crop, scale: 368 / crop.w })}"></div>
        <div style="margin-top:18px;font-size:20px;font-weight:600;text-align:center;color:#fff">${label}</div>
      </div>`).join('')}
    <div style="position:absolute;left:0;right:0;bottom:44px;text-align:center;font-size:16px;color:var(--muted)">
      Also: screenshot an element · copy URL, title or Markdown link · duplicate, pin, mute or pop out a tab · clear this site's cache
    </div>`,

  '05-private-customizable': () => `
    <div class="glow"></div><div class="dots"></div>
    <div style="position:absolute;left:72px;top:150px;width:430px;display:grid;gap:22px">
      <div class="eyebrow">Yours, and only yours</div>
      <h1 style="font-size:52px">Private by design.<br><span class="grad">Made to fit you.</span></h1>
      <div style="display:grid;gap:14px;margin-top:10px;font-size:19px;color:#d5dbe7">
        ${['No account, no tracking, no ads', 'Nothing leaves your browser', 'Shortcuts sync with your Chrome profile', 'Import and export anytime', 'No access to sites until you open Flick'].map((t) => `<div style="display:flex;gap:12px;align-items:center"><span style="width:24px;height:24px;border-radius:7px;background:rgba(61,139,255,.16);color:#7fb1ff;display:grid;place-items:center;font-size:15px">✓</span>${t}</div>`).join('')}
      </div>
    </div>
    ${browserWindow('20-settings', { left: 560, top: 130, width: 900, url: 'Flick settings', crop: { x: 120, y: 0, w: 1160, h: 820 } })}`,
};

const PROMO = {
  'small-tile-440x280': [440, 280, () => `
    <div class="glow" style="background:radial-gradient(320px 220px at 50% -10%,rgba(61,139,255,.45),transparent 70%),radial-gradient(260px 200px at 100% 100%,rgba(124,92,255,.28),transparent 70%)"></div>
    <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;gap:0">
      <div style="display:grid;justify-items:center;gap:12px">
        <div style="display:flex;align-items:center;gap:14px"><img src="${icon}" width="64" height="64" style="border-radius:15px;box-shadow:0 12px 30px rgba(0,0,0,.5)"><span style="font-size:52px;font-weight:800;letter-spacing:-.04em">Flick</span></div>
        <div style="font-size:21px;font-weight:600;color:#dbe4f5">Command palette for Chrome</div>
        <div class="keys" style="margin-top:6px;transform:scale(.8)"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>K</kbd></div>
      </div>
    </div>`],
  'marquee-1400x560': [1400, 560, () => `
    <div class="glow"></div><div class="dots"></div>
    <div style="position:absolute;left:84px;top:0;bottom:0;width:560px;display:grid;align-content:center;gap:22px">
      <div style="display:flex;align-items:center;gap:16px"><img src="${icon}" width="60" height="60" style="border-radius:14px"><span style="font-size:40px;font-weight:800;letter-spacing:-.04em">Flick</span></div>
      <h1 style="font-size:58px"><span class="grad">Your browser,<br>one shortcut away.</span></h1>
      <p class="sub" style="font-size:20px">Tabs, bookmarks, shortcuts, snippets and page tools — in one keyboard-first palette.</p>
      <div class="keys"><kbd>⌘</kbd><kbd>⇧</kbd><kbd>K</kbd></div>
    </div>
    <div class="crop" style="left:720px;top:92px;transform:rotate(-1.5deg);${palette('02-roadmap', 1.04)}"></div>`],
};

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
async function render(file, w, h, body) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  // Rendered from a file so the page may load the file:// captures.
  const tmp = path.join(RAW, '.render.html');
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`);
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: 'png' });
  await page.close();
}

fs.mkdirSync('store/screenshots', { recursive: true });
fs.mkdirSync('store/promo', { recursive: true });
for (const [name, html] of Object.entries(SCREENS)) await render(`store/screenshots/${name}.png`, 1280, 800, html());
for (const [name, [w, h, html]] of Object.entries(PROMO)) await render(`store/promo/${name}.png`, w, h, html());
await browser.close();
console.log('done');
