# Roadmap

Phased plan for Flick. Each phase is shippable on its own.

---

## Phase 0 — Scaffold ✅

**Goal:** Project setup, docs, empty palette shell.

- [x] WXT + React + TypeScript project
- [x] Tailwind CSS 4
- [x] Manifest: commands, permissions, options page
- [x] Background: command listener + inject content script
- [x] Content script: integrated UI placeholder
- [x] Default aliases seed data
- [x] Documentation (this folder)

---

## Phase 1 — Core palette ✅

**Goal:** Usable alias navigation + basic UX.

- [x] Wire **cmdk** into `FlickShell`
- [x] **Alias provider** — load from storage, fuzzy match triggers
- [x] **Navigate action** — open URL on Enter
- [x] Keyboard: ↑↓ navigate, Enter select, Esc close
- [x] Click outside to dismiss
- [x] Options page: list/add/edit/delete aliases (modal forms + sticky sidebar)
- [x] Quick-add suggestion chips in the palette

---

## Phase 2 — Snippets & developer tools ✅

**Goal:** Quick actions beyond navigation.

- [x] **Text snippets** — reusable clipboard text with fuzzy search
- [x] **Screenshot viewport** — `captureVisibleTab`, download PNG
- [x] **Element-selection screenshot** — pick an element to capture
- [x] **Toggle dark mode** — CSS filter inversion
- [x] **Toggle column grid** — 12-column design overlay
- [x] **Toggle pixel rulers** — top and left edge rulers
- [x] **Duplicate / pin / mute tab** — tab management utilities
- [x] **Move to new window** — detach current tab
- [x] **Bookmark page** — save to Chrome bookmarks
- [x] **Copy URL / Markdown link** — clipboard utilities
- [x] **Clear cache** — remove cached files + reload
- [x] Toast notifications for all actions
- [x] Page interaction guard (keyboard event blocking)
- [x] Restricted-page detection (`chrome://`, Web Store, etc.)

---

## Phase 3 — Browser search

**Goal:** Flick becomes a real navigation hub.

- [ ] **Tab provider** — fuzzy search open tabs, switch on select
- [ ] **Bookmark provider** — `bookmarks.search`
- [ ] **History provider** — debounced `history.search`
- [ ] Grouped results in cmdk (Aliases | Tabs | Bookmarks | History)
- [ ] Empty state hints ("Try backend-pull or a tab name")
- [ ] Recent commands — store last 10 navigations

---

## Phase 4 — Templates & polish

**Goal:** Power-user features and production quality.

- [ ] **URL templates** — `pr 123` → `.../pull/123` (see [ALIASES.md](./ALIASES.md))
- [ ] Alias import/export (JSON)
- [ ] Custom shortcut per alias (optional)
- [ ] Light/dark theme toggle for the palette
- [ ] Extension icons (16–128px) — refined set
- [ ] Chrome Web Store listing

---

## Phase 5 — Nice-to-haves

- [ ] Firefox build verification (`wxt -b firefox`)
- [ ] Sync conflict handling for aliases
- [ ] Omnibox integration (`omnibox` API — type `cs ` in address bar)
- [ ] GitHub API: `pr 123` resolves without hardcoded repo (OAuth or PAT — high complexity)
- [ ] Native messaging host for system-wide hotkey (out of scope unless requested)

---

## Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-15 | WXT over CRXJS | Greenfield; better entrypoint DX |
| 2026-06-15 | Runtime content script registration | Avoid injecting on every page load |
| 2026-06-15 | cmdk + Fuse.js | Proven, accessible, keyboard-first |
| 2026-06-15 | No popup entrypoint | Palette is primary UI |
| 2026-06-19 | Shadow DOM guard content script | Block host-page shortcuts at document_start |
| 2026-06-20 | Modal-based forms in settings | Cleaner UX than inline forms |
