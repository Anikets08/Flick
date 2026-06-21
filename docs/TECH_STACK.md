# Tech Stack

Research date: June 2026. This document records why we chose each piece and what we rejected.

## Summary

**Flick** is built with **WXT + React 19 + TypeScript + Tailwind CSS 4**, using **cmdk** for the palette UI and **Fuse.js** for fuzzy search. This matches modern extension best practices and aligns with your existing Keevo extension patterns.

---

## Extension framework: WXT

### Compared options

| Framework | Verdict |
|---|---|
| **WXT** ✅ | Recommended default for new extensions in 2026 |
| Plasmo | Strong React/CSUI story, but slower maintenance trajectory |
| CRXJS | Good Vite plugin; you already use it in Keevo, but less complete as a framework |
| Raw Vite + manual manifest | Maximum control, poor DX for entrypoints and HMR |

### Why WXT

1. **Active maintenance** — Regular releases through 2025–2026; large contributor base
2. **Vite-native** — Fast HMR, familiar if you know Keevo's Vite setup
3. **File-based entrypoints** — `background/`, `flick.content/`, `options/` map cleanly to manifest surfaces
4. **Cross-browser** — Chrome, Firefox, Edge, Safari (beta) from one codebase
5. **Content Script UI helpers** — `createIntegratedUi` for Shadow DOM–isolated overlays
6. **Auto-imports** — `defineBackground`, `defineContentScript`, etc.

### Why not CRXJS (Keevo's current stack)

Keevo uses `@crxjs/vite-plugin` successfully. CRXJS is a Vite plugin, not a full framework — you maintain manifest wiring, entrypoint discovery, and messaging patterns yourself. For a **greenfield** project where we want file-based routing and integrated content-script UI, WXT is the better starting point.

We can still borrow patterns from Keevo: `cmdk`, `fuse.js`, Radix/shadcn if we add them later.

---

## UI: React 19 + TypeScript

- **React 19** — WXT's official React module (`@wxt-dev/module-react`) targets React 19
- **TypeScript strict** — Catches manifest/API mismatches early
- **cmdk** — Battle-tested command palette; keyboard navigation, grouping, accessibility built in
- **Lucide React** — Icons for command categories (tab, bookmark, utility, etc.)

### Future: shadcn/ui

Optional for Phase 2+. Keevo uses Radix + shadcn; we can add the same for Options page forms and polished palette styling. Not in the scaffold to keep bundle lean.

---

## Styling: Tailwind CSS 4

- **@tailwindcss/vite** — First-class Vite integration (same as Keevo)
- **CSS variables** — Flick overlay uses a dark glass palette independent of host page
- **Content script isolation** — Tailwind classes live inside WXT's integrated UI shadow root, avoiding page CSS bleed

---

## Search: Fuse.js

Fuse.js provides fuzzy matching across:

- Alias triggers and keywords
- Open tab titles and URLs
- Bookmark titles and URLs
- History entries (debounced)

Alternatives considered:

| Library | Notes |
|---|---|
| FlexSearch | Faster at scale, more setup |
| MiniSearch | Good for full-text, less ideal for short triggers |
| Native `includes()` | Too brittle for typo-tolerant search |

Fuse.js is already proven in Keevo and sufficient for palette-scale datasets (< few thousand items per query).

---

## State: Zustand

Lightweight store for:

- Palette open/closed
- Query string
- Merged command results
- Recent commands

Avoid storing state in the background service worker — MV3 workers are terminated after ~30s idle. Persist recents and aliases in `chrome.storage.sync`.

---

## Browser APIs used

| API | Purpose |
|---|---|
| `chrome.commands` | Global shortcut (`⌘⇧K` / `Ctrl+Shift+K`) |
| `chrome.tabs` | Query/switch/create tabs |
| `chrome.scripting` | Inject Flick content script on demand |
| `chrome.storage.sync` | Aliases, settings, recents |
| `chrome.bookmarks` | Bookmark search |
| `chrome.history` | History search |
| `chrome.tabs.captureVisibleTab` | Viewport screenshot utility |

---

## References

- [WXT documentation](https://wxt.dev)
- [WXT vs Plasmo vs CRXJS (2026)](https://trybuildpilot.com/649-wxt-vs-plsmo-vs-crxjs-2026)
- [Extension frameworks compared (2026)](https://blog.extenshi.io/posts/extension-frameworks-compared-2026/)
- [Chrome MV3 commands API](https://developer.chrome.com/docs/extensions/reference/api/commands)
