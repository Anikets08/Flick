# Features

Everything you can do from the Flick palette (`⌘⇧K` / `Ctrl+Shift+K`).

---

## URL Aliases

Customizable shortcuts that navigate to a URL. Managed from the **Settings** page or added via **Quick add** chips in the palette.

| Trigger | Target | Description |
|---------|--------|-------------|
| `gh` | github.com | GitHub |
| `yt` | youtube.com | YouTube |
| `yt` | youtube.com (bare) / template search | YouTube |
| `mdn` | developer.mozilla.org | MDN Web Docs |
| `cal` | calendar.google.com | Google Calendar |

Aliases support:
- **Exact trigger match** (highest priority)
- **Fuzzy search** on trigger, description, keywords, URL (via Fuse.js)
- **Open in current tab** or **new tab**
- **Enable/disable** without deleting
- **Sync across devices** via `chrome.storage.sync`
- **Quick-add suggestion chips** for 12 popular sites

### URL Templates

Shortcuts can include a `{variable}` placeholder that accepts input from the palette. Type the trigger followed by a value, and the value is URL-encoded and substituted into the template URL.

| Trigger | Template URL | Example input | Resolved URL |
|---------|-------------|---------------|--------------|
| `yt` | `https://www.youtube.com/results?search_query={variable}` | `yt tony stark` | `youtube.com/results?search_query=tony%20stark` |
| `gh-search` | `https://github.com/search?q={variable}` | `gh-search react` | `github.com/search?q=react` |

- **Trigger + value** — first word is the trigger, the rest is the value
- **Longest-prefix matching** — `backend pull 123` matches trigger `backend-pull` with value `123`
- **Fallback** — typing just the trigger (no value) opens the bare `url`
- **Validation** — template URL must contain `{variable}` to be saved
- **Multi-substitution** — every occurrence of `{variable}` in the URL is replaced
- **URL encoding** — values are `encodeURIComponent`-encoded for safe navigation

---

## Developer Tools

Built-in commands that run directly on the active tab. Search by name or keyword.

### Capture & Visual

| Search Keywords | Action | What it does |
|----------------|--------|-------------|
| `ss`, `screenshot`, `capture`, `snapshot` | **Screenshot** | Captures the visible viewport and saves to `~/Downloads/screenshot-<timestamp>.png` |
| `color`, `pick`, `eyedropper`, `pipette`, `cp` | **Color Picker** | Pick a color from anywhere on the page — hover for live preview, click to copy hex to clipboard |
| `dark`, `night`, `theme`, `invert`, `dm` | **Toggle Dark Mode** | Inverts page colors (CSS filter) — run again to revert |
| `grid`, `layout`, `columns`, `design`, `g` | **Toggle Column Grid** | Overlays a 12-column responsive grid on the page — run again to hide |
| `ruler`, `measure`, `pixel`, `px`, `r` | **Toggle Pixel Rulers** | Shows pixel rulers along the top and left edges — run again to hide |

### Tab Management

| Search Keywords | Action | What it does |
|----------------|--------|-------------|
| `duplicate`, `copy`, `clone`, `dup` | **Duplicate Tab** | Creates an exact copy of the current tab |
| `pin`, `unpin`, `keep` | **Toggle Pin Tab** | Pins or unpins the current tab |
| `mute`, `unmute`, `audio`, `sound`, `silence` | **Toggle Mute Tab** | Mutes or unmutes audio from the current tab |
| `move`, `window`, `detach`, `popout` | **Move to New Window** | Detaches the current tab into its own window |

### Page Actions

| Search Keywords | Action | What it does |
|----------------|--------|-------------|
| `bookmark`, `save`, `favorite`, `star` | **Bookmark Page** | Saves the current page to Chrome bookmarks |
| `copy`, `markdown`, `md`, `link` | **Copy as Markdown Link** | Copies `[page title](url)` to the clipboard |
| `copy`, `url`, `address` | **Copy URL** | Copies the current page URL to the clipboard |

### Cache & Storage

| Search Keywords | Action | What it does |
|----------------|--------|-------------|
| `cache`, `clear`, `refresh`, `cc` | **Clear Cache** | Removes all cached files, then reloads the page |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘⇧K` / `Ctrl+Shift+K` | Open/close Flick |
| `↑` / `↓` | Navigate results |
| `↵` | Select highlighted item |
| `Esc` | Close palette |

---

## Technical Architecture

- **Shadow DOM isolation** — the palette is rendered in a closed shadow root, completely isolated from page styles
- **Page interaction guard** — when Flick is open, keyboard and focus events are captured to prevent leaking to the host page
- **Service worker** — background script handles command dispatch and executes all actions
- **Message passing** — palette communicates with the background via `browser.runtime.sendMessage` (`EXECUTE_ACTION`, `OPEN_OPTIONS`)
- **Feature detection** — restricted URLs (`chrome://`, `chrome-extension://`, `about:`) are detected and palette is blocked from opening
