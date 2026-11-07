# Tech Stack

Research date: June 2026. This document records why we chose each piece and what we rejected.

## Summary

**Flick** is built with **WXT + Preact + TypeScript + Tailwind CSS 4**. The on-page palette is plain Preact with a hand-rolled, ARIA-compliant result list and a small built-in ranker; the Settings page uses React-style components via `preact/compat`. The palette ships as ~56 KB of JS + ~12 KB of CSS, injected only when first opened on a tab.

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

We can still borrow patterns from Keevo (Radix/shadcn) for Settings if needed — keep them out of the palette bundle.

---

## UI: React 19 + TypeScript

- **Preact (`preact/compat`)** — Components are written against the React API, but the build aliases `react`/`react-dom` to Preact via `@preact/preset-vite`. This cuts the palette bundle roughly in half. Stay on Preact 10: Preact 11 skipped effect cleanups on unmount in testing, which left the host page locked after closing the palette.
- **TypeScript strict** — Catches manifest/API mismatches early
- **Own result list** (`FlickShell.tsx`) — combobox + listbox ARIA pattern with ↑/↓, Ctrl+N/P/J/K, Enter, Esc. Replaced cmdk (~36 KB with its Radix dialog dependencies), which we'd reduced to keyboard handling since filtering and grouping were already ours.
- **Palette is plain Preact** (`lucide-preact` icons, `preact/hooks`); only Settings goes through `preact/compat`.
- **Lucide React** — Icons for command categories (tab, bookmark, utility, etc.)

### Future: shadcn/ui

Optional for Phase 2+. Keevo uses Radix + shadcn; we can add the same for Options page forms and polished palette styling. Not in the scaffold to keep bundle lean.

---

## Styling: Tailwind CSS 4

- **@tailwindcss/vite** — First-class Vite integration (same as Keevo)
- **CSS variables** — Flick overlay uses a dark glass palette independent of host page
- **Content script isolation** — Tailwind classes live inside WXT's integrated UI shadow root, avoiding page CSS bleed

---

## Search: built-in ranker (`src/lib/search/rank.ts`)

One ranking for shortcuts, snippets, tools, and open tabs:

- Each query word must match a whole word or word prefix in a weighted field (name > keywords > description). Mid-word matches are opt-in per field (URLs, tab titles), so "sig" doesn't hit "design".
- A typo fallback (edit distance ≤ 1, or ≤ 2 for 8+ letters) runs only when **no group** has a direct match — run per group, it let fuzzy junk in one group outrank a real match in another.
- Bookmarks and history use Chrome's own search (`bookmarks.search`, `history.search`).

Replaced Fuse.js (~26 KB): it became just the typo fallback, which 40 lines of edit distance covers. Relevance is pinned by `e2e/search.spec.ts`. Revisit (FlexSearch/MiniSearch) only if a single search ever spans thousands of items.

---

## State: hooks + chrome.storage

Palette state (query, results, recents) lives in component hooks; shortcuts and snippets in `chrome.storage.sync`, recents in `chrome.storage.local`. No state library needed.

Avoid storing state in the background service worker — MV3 workers are terminated after ~30s idle.

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
