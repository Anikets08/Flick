# Chrome Web Store submission

Copy-paste answers for the Developer Dashboard. Keep this in sync with
`wxt.config.ts` — `e2e/manifest.spec.ts` fails if the manifest asks for anything
not listed here.

## Store listing (ASO)

Search on the Web Store weighs the **name** most, then the **summary**, then the
description. Each keyword appears where a user would expect it, and none are
repeated for ranking: Google rejects keyword stuffing and other products' names.

| Field | Value |
|---|---|
| Name (manifest `name`, ≤ 75) | Flick — Command Palette, Tab Search & Shortcuts |
| Summary (manifest `description`, ≤ 132) | A keyboard command palette for Chrome: search tabs and bookmarks, jump to sites with shortcuts, paste snippets and run page tools. |
| Category | Workflow & Planning (alternative: Developer Tools) |
| Language | English |
| Version | 1.0.0 |

Target searches: *command palette*, *tab search*, *tab switcher*, *search bookmarks*, *keyboard shortcuts*, *url shortcuts*, *quick launcher*, *text snippets*, *color picker*, *dark mode*, *screenshot*.

### Description (paste as plain text)

```
Flick puts your whole browser one shortcut away.

Press ⌘⇧K (Ctrl+Shift+K on Windows and Linux) on any page, or click the toolbar icon, and type a few letters. Jump to an open tab, find a bookmark, open a site with your own shortcut, paste saved text, or run a tool on the page — without touching the mouse.

SEARCH EVERYTHING
• Open tabs — switch to any tab by title or address, across all windows
• Bookmarks — find any bookmark in a keystroke
• History — optional; turn it on in Settings when you want it
• The web — anything else goes straight to a Google search

SHORTCUTS THAT TAKE YOU THERE
• Make your own: "gh" opens GitHub, "cal" opens your calendar
• Search built in: "yt lofi beats" searches YouTube, "pr 482" opens pull request #482
• Open in the current tab or a new one, and sync to every computer you use Chrome on

SNIPPETS
• Save text you type all the time — your email, address, signature, meeting link
• Type "email", press Enter, and it's on your clipboard

15 BUILT-IN PAGE TOOLS
• Screenshot the visible page, or just one element
• Color picker — hover for a live preview, click to copy the hex code
• Dark mode for any site
• 12-column grid overlay and pixel rulers for design checks
• Copy the URL, title, or a Markdown link
• Duplicate, pin, mute, or pop a tab out into its own window
• Bookmark the page
• Clear this site's cache and hard-reload

MADE FOR THE KEYBOARD
• Opens in milliseconds and stays out of the page's way
• Arrow keys or Ctrl+N / Ctrl+P to move, Enter to run, Esc to close
• Recent commands come first, so your favorites are always one keystroke away

PRIVATE BY DESIGN
• No account, no ads, no tracking, no analytics
• Nothing you do in Flick leaves your browser
• Flick can't see a site until you open it there
• Import and export your shortcuts and snippets anytime

Free and open source: https://github.com/Anikets08/Flick
```

### Graphics

Generated from the real extension by the scripts in `store/scripts/` (see `store/README.md`).

| Asset | File | Required |
|---|---|---|
| Store icon 128×128 | `public/icon/128.png` (from the package) | yes |
| Screenshots 1280×800 (in this order) | `store/screenshots/01…05-*.png` | ≥ 1 |
| Small promo tile 440×280 | `store/promo/small-tile-440x280.png` | yes |
| Marquee 1400×560 | `store/promo/marquee-1400x560.png` | optional (needed to be featured) |
| Promo video | `store/video/flick-promo.mp4` → upload to YouTube, paste the link | optional |

## Single purpose

> Flick is a keyboard-driven command palette for Chrome: press a shortcut (or click the toolbar icon), type a few letters, and jump to a site, open tab, bookmark, or page from history, paste a saved snippet, or run a quick tool on the current page.

## Permission justifications

The manifest requests **no host permissions** and has **no content scripts that run automatically**. Flick only touches a page after the user opens Flick on it (keyboard shortcut or toolbar icon), which grants `activeTab` for that tab.

| Permission | Justification (paste into the dashboard) |
|---|---|
| `activeTab` | When the user opens Flick with its keyboard shortcut or toolbar icon, Flick shows its command palette on the current tab and runs the tool the user picks there (e.g. copy the page URL, take a screenshot, pick a color, toggle a dark-mode filter). Flick never accesses tabs the user hasn't opened it on. |
| `scripting` | Injects the command palette into the current tab when the user opens Flick, and runs user-selected page tools (dark-mode filter, layout grid, pixel rulers, copy to clipboard). Only on the tab where the user invoked Flick, via `activeTab`. |
| `tabs` | Lets the user search their open tabs by title and URL and switch to one, and powers the tab tools the user can run (duplicate, pin, mute, move to a new window). Tab titles/URLs are read only when the palette is open and never stored or transmitted. |
| `bookmarks` | Shows the user's matching bookmarks in palette search results, and powers the "Bookmark Page" command. |
| `storage` | Saves the user's custom shortcuts and text snippets (synced via Chrome Sync) and their recently used commands (local only). |
| `browsingData` | Powers the "Clear Cache" command, which clears the HTTP cache and Cache Storage for the current site only (scoped with `origins`), then reloads it. Nothing is cleared unless the user runs that command. |
| `sidePanel` | On pages where extensions can't show UI (e.g. `chrome://` pages, the Web Store), Flick opens in Chrome's side panel instead. |
| `history` (optional) | Off by default. If the user turns on "History" in Settings → Features, Chrome asks for this permission, and matching pages from history appear in palette search. Can be turned off at any time, which removes the permission. |

**Remote code:** No. All code ships in the package; nothing is fetched and evaluated at runtime.

## Data usage (Privacy practices tab)

Flick processes data only on the user's device and transmits nothing, so under the
dashboard's definitions it **does not collect** any of the listed data types.
Read the current wording before ticking boxes; if in doubt, the closest
categories are "Web history" and "Website content", used only on-device for the
features above. Certify:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/Anikets08/Flick/blob/main/PRIVACY.md

## What users see at install

Expected warnings: _"Read your browsing history"_ (from `tabs`) and _"Read and change your bookmarks"_ (from `bookmarks`). There is no "Read and change all your data on all websites" warning.

## Review tips

- Keep the store description consistent with the single purpose above; mention that Flick opens with a keyboard shortcut *or the toolbar icon*.
- Screenshots should show the features that use each permission (tab search, bookmarks, tools), so reviewers can connect them.
- Before uploading, load the production build (`.output/chrome-mv3`) and check the install warnings Chrome shows match the section above.
