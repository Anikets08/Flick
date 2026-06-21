<div align="center">

<img src="public/icon/128.png" alt="Flick icon" width="96" height="96">

# Flick

A command palette for Chrome. Press a shortcut, type a command, and go — custom URL aliases, text snippets, and built-in developer tools in one fast, keyboard-first overlay.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with WXT](https://img.shields.io/badge/Built%20with-WXT-34d399.svg)](https://wxt.dev)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4.svg)](https://tailwindcss.com)

</div>

---

## Overview

Flick brings the speed of macOS Spotlight to your browser. Instead of reaching for the mouse or typing long URLs, press **`⌘⇧K`** and type a few characters to jump anywhere or trigger an action.

| What you type | What happens |
|---|---|
| `gh` | Opens github.com in a new tab |
| `mdn` | Opens MDN Web Docs |
| `email` | Copies your email address to the clipboard |
| `ss` | Takes a screenshot of the current tab |
| `dark` | Toggles dark mode on the page |
| `grid` | Overlays a 12-column design grid |
| `cache` | Clears cache and reloads the page |

Everything is configurable from a polished settings page — add your own shortcuts, snippets, and toggle built-in tools on or off.

---

## Features

### URL Aliases

Custom triggers that navigate to any URL. Managed from the **Settings** page or added via **quick-add chips** right inside the palette.

- Case-insensitive trigger matching (exact match ranks highest)
- Fuzzy search across trigger, description, keywords, and URL (powered by Fuse.js)
- Open in current tab or new tab
- Enable/disable without deleting
- Synced across devices via `chrome.storage.sync`
- 12 popular-site suggestions ready to add in one click

### Text Snippets

Reusable text blocks that copy to your clipboard on select. Perfect for email addresses, phone numbers, signatures, or any frequently-typed text.

- Fuzzy-searchable by trigger, label, and keywords
- Synced alongside aliases via `chrome.storage.sync`
- One-click suggestions for common snippets (email, address, phone, name)

### Developer Tools

Thirteen built-in commands that run directly on the active tab. Search by name or keyword — no setup required.

| Category | Commands |
|---|---|
| **Capture & Visual** | Screenshot (viewport / select element), Toggle dark mode, Toggle column grid, Toggle pixel rulers |
| **Tab Management** | Duplicate tab, Toggle pin, Toggle mute, Move to new window |
| **Page Actions** | Bookmark page, Copy URL, Copy as Markdown link |
| **Cache & Storage** | Clear cache + reload |

### Design & UX

- **Shadow DOM isolation** — the palette renders in a closed shadow root, immune to host-page CSS
- **Keyboard-first** — full `cmdk` navigation with `↑`/`↓`, `Enter`, `Esc`
- **Page interaction guard** — while the palette is open, keyboard events are captured so host-page shortcuts (e.g. GitHub's `/`) never fire
- **Restricted-page detection** — gracefully handles `chrome://`, Web Store, and other blocked URLs
- **Toast feedback** — every action confirms with a lightweight toast
- **Polished settings** — sidebar navigation, modal-based forms, sticky positioning, ambient accents

---

## Installation

### From source (development)

**Prerequisites:** Node.js 20+, npm, Google Chrome

```bash
git clone https://github.com/Anikets08/flick.git
cd flick
npm install
npm run dev
```

WXT launches Chrome with the extension loaded and hot-reloading enabled. If it doesn't open automatically:

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3` directory

### Production build

```bash
npm run build      # outputs to .output/chrome-mv3/
```

Load the built folder unpacked, or run `npm run zip` to package for the Chrome Web Store.

---

## Usage

### Opening the palette

| Platform | Shortcut |
|---|---|
| **macOS** | `⌘⇧K` (Command + Shift + K) |
| **Windows / Linux** | `Ctrl+Shift+K` |

**Fallback:** click the Flick icon in the toolbar.

> Chrome requires `Ctrl` or `⌘` on every extension shortcut. Change it anytime at `chrome://extensions/shortcuts`.

### Palette controls

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate results |
| `Enter` | Select highlighted item |
| `Esc` | Close palette |
| Click outside | Close palette |

### Managing shortcuts & snippets

Open the settings page from the palette footer (**Settings** button) or by clicking the toolbar icon. The settings page features:

- **Sticky sidebar** navigation between Shortcuts, Snippets, and Features
- **Modal-based forms** — click **New** to add, or **Edit** on any row to modify
- **Toggle switches** to enable/disable individual entries without deleting
- **One-click suggestions** to bootstrap an empty collection

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Extension framework | [WXT](https://wxt.dev) | Vite-native, file-based entrypoints, cross-browser, excellent DX |
| UI | React 19 + TypeScript | Strong ecosystem, type safety, matches modern standards |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration, scoped via Shadow DOM |
| Command palette | [cmdk](https://cmdk.paco.me) | Accessible, keyboard-first, battle-tested |
| Fuzzy search | [Fuse.js](https://fusejs.io) | Lightweight, typo-tolerant, ideal for palette-scale datasets |
| State | Zustand | Minimal, works well in extensions |
| Icons | Lucide React | Consistent, tree-shakeable |

---

## Project Structure

```
flick/
├── docs/                          # Design docs & architecture
├── public/                        # Extension icons & static assets
├── src/
│   ├── assets/styles/             # Global CSS + Tailwind theme
│   ├── components/                # React UI (FlickShell)
│   ├── data/                      # Default aliases, snippets, dev tools
│   ├── entrypoints/
│   │   ├── background/            # Service worker — commands, actions
│   │   ├── flick.content/         # Overlay UI (Shadow DOM)
│   │   ├── flick-guard.content/   # Keyboard event guard
│   │   └── options/               # Settings page
│   ├── hooks/                     # Search & interaction hooks
│   ├── lib/
│   │   ├── actions/               # Action execution (screenshot, copy, etc.)
│   │   ├── search/                # Fuse.js providers (aliases, snippets, tools)
│   │   ├── storage/               # chrome.storage wrappers
│   │   └── open-flick.ts          # Shortcut → active tab logic
│   └── types/                     # Shared TypeScript types
├── wxt.config.ts                  # Manifest + Vite config
└── package.json
```

---

## Architecture

```
Keyboard shortcut (⌘⇧K)
        │
        ▼
Background service worker
        │  injects + sends FLICK_TOGGLE
        ▼
Flick content script (Shadow DOM)
        │  mounts React + cmdk overlay
        ▼
User types → Fuse.js search
  ├── Alias provider    (chrome.storage.sync)
  ├── Snippet provider  (chrome.storage.sync)
  └── Dev tool provider (static registry)
        │
        ▼
Select → EXECUTE_ACTION message → Background
        │
        ▼
tabs API / scripting API / clipboard / downloads
```

The palette communicates with the background service worker via `browser.runtime.sendMessage`. All actions requiring privileged APIs (`tabs`, `bookmarks`, `captureVisibleTab`, `downloads`, `browsingData`) execute in the background. The content script handles UI, search, and element-selection screenshots.

A separate **guard content script** runs at `document_start` to intercept keyboard events while the palette is open, preventing host-page shortcuts from firing.

For the full design document, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Development

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server + load extension in Chrome with HMR |
| `npm run build` | Production build → `.output/chrome-mv3/` |
| `npm run compile` | TypeScript typecheck (no emit) |
| `npm run zip` | Build + zip for Chrome Web Store upload |
| `npm run dev:firefox` | Dev build for Firefox |
| `npm run build:firefox` | Production build for Firefox |

### Path aliases

`@/` maps to `src/`:

```typescript
import { cn } from '@/lib/cn';
import type { UrlAlias } from '@/types';
```

### Debugging

- **Background service worker:** `chrome://extensions` → Flick → **Service worker** → Inspect
- **Content script / overlay:** Right-click the page → Inspect → Console (filter by extension context)
- **Storage:** DevTools → Application → Extension Storage, or run `chrome.storage.sync.get(null, console.log)` in the service worker console

### Firefox

```bash
npm run dev:firefox
npm run build:firefox
```

Some APIs differ between Chrome and Firefox — test before shipping.

For the full guide, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

---

## Roadmap

### Done

- [x] WXT + React 19 + TypeScript + Tailwind 4 scaffold
- [x] Shadow DOM–isolated palette with `cmdk`
- [x] URL aliases with Fuse.js fuzzy search
- [x] Text snippets with clipboard paste
- [x] 13 built-in developer tools (screenshot, dark mode, grid, rulers, tab management, copy, bookmark, clear cache)
- [x] Element-selection screenshot mode
- [x] Settings page with sidebar nav, modal forms, sticky positioning
- [x] Quick-add suggestion chips in the palette
- [x] Toast notifications for all actions
- [x] Page interaction guard (keyboard event blocking)
- [x] Restricted-page detection

### Planned

- [ ] Tab search & switching provider
- [ ] Bookmark search provider
- [ ] History search provider
- [ ] URL templates (`pr 123` → `.../pull/123`)
- [ ] Alias import/export (JSON)
- [ ] Recent commands
- [ ] Light/dark theme toggle for the palette
- [ ] Omnibox integration (`flick ` in address bar)
- [ ] Firefox build verification

See [docs/ROADMAP.md](./docs/ROADMAP.md) for the full phased plan.

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run `npm run dev` to start developing with HMR
4. Make your changes — ensure `npm run compile` passes
5. Open a pull request with a clear description

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide, including how to add new developer tools and search providers.

---

## Documentation

| Document | Description |
|---|---|
| [TECH_STACK.md](./docs/TECH_STACK.md) | Framework comparison & decisions |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, data flow, messaging |
| [FEATURES.md](./docs/FEATURES.md) | Complete feature reference |
| [ALIASES.md](./docs/ALIASES.md) | Alias format & template spec |
| [ROADMAP.md](./docs/ROADMAP.md) | Phased build plan |
| [DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Dev workflow, debugging, publishing |

---

## License

[MIT](./LICENSE)
