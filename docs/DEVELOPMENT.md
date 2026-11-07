# Development Guide

## Prerequisites

- Node.js 20+
- npm (or pnpm/yarn — project uses npm)
- Google Chrome

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start WXT dev server + load extension in Chrome |
| `npm run build` | Production build → `.output/chrome-mv3/` |
| `npm run compile` | Typecheck only |
| `npm run test:e2e` | Build, then run Playwright end-to-end tests against the built extension (`HEADED=1` to watch) |
| `npm run zip` | Build + zip for Chrome Web Store |

## First-time setup

```bash
cd flick
npm install
npm run dev
```

WXT opens Chrome with the unpacked extension. If it doesn't:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Load `.output/chrome-mv3`

## Testing the shortcut

1. Focus any normal webpage (not `chrome://`)
2. Press **`⌘⇧K`** (Mac) or **`Ctrl+Shift+K`** (Windows/Linux) on any normal webpage — not `chrome://`
3. Placeholder overlay should appear

**Fallback:** click the extension icon in the toolbar.

Change shortcut: `chrome://extensions/shortcuts` → **Flick**

## Debugging

### Background service worker

`chrome://extensions` → Flick → **Service worker** → Inspect

Logs from `src/entrypoints/background/index.ts` appear here.

### Content script / overlay

Right-click the page → Inspect → Console. Filter by extension context or look for Flick logs.

### Storage

DevTools → Application → Extension Storage → Flick

Or in service worker console:

```javascript
chrome.storage.sync.get(null, console.log)
```

## Hot reload

WXT HMR reloads most changes automatically. If the extension gets into a bad state:

- Click reload on `chrome://extensions`
- Or restart `npm run dev`

## Adding a new entrypoint

See [WXT entrypoints docs](https://wxt.dev/guide/essentials/entrypoints.html).

Examples:

- `src/entrypoints/foo.content/index.tsx` → content script named `foo`
- `src/entrypoints/options/index.html` → options page

## Path aliases

`@/` maps to `src/`:

```typescript
import { cn } from '@/lib/cn';
import type { UrlAlias } from '@/types';
```

## Icons (TODO)

Add PNGs to `public/`:

```
public/
├── icon-16.png
├── icon-32.png
├── icon-48.png
├── icon-128.png
```

WXT auto-discovers these filenames. Until added, Chrome shows a default puzzle piece.

## Building for production

```bash
npm run build
```

Output: `.output/chrome-mv3/`

Load unpacked from that folder to test the production build.

## Firefox (optional)

```bash
npm run dev:firefox
npm run build:firefox
```

Some APIs differ; test before shipping.

## Common issues

### Shortcut does nothing

- Check shortcut isn't conflicting at `chrome://extensions/shortcuts`
- Page may be restricted (`chrome://`, Web Store) — content scripts can't run
- Inspect service worker for errors

### Overlay doesn't appear

- Content script may not be injected — check background logs
- Host page CSP may block injection (rare on normal sites)

### Styles look wrong

- Ensure Tailwind is imported in content script entrypoint
- Integrated UI uses shadow DOM — global page CSS won't affect palette

## Publishing checklist (future)

- [ ] Icons 16–128px
- [ ] Privacy policy (if using sync/history)
- [ ] Store screenshots
- [ ] `npm run test:e2e` passes
- [ ] `npm run zip`
- [ ] Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
