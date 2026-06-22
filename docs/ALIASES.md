# Aliases

How custom shortcuts work in Flick.

## Basic alias

A plain alias maps a **trigger** (what you type) to a **URL** (where you go).

```json
{
  "id": "backend-pulls",
  "trigger": "backend-pull",
  "url": "https://github.com/memora/backend/pulls",
  "description": "Open backend repo pull requests",
  "keywords": ["github", "pr", "pulls", "memora"],
  "newTab": false,
  "enabled": true
}
```

### Matching rules (Phase 1)

1. Trigger match is **case-insensitive**
2. Exact trigger match ranks highest
3. `keywords` participate in Fuse.js fuzzy search
4. `description` is shown as subtitle in the palette

### Examples

| You type | Result |
|---|---|
| `backend-pull` | `https://github.com/memora/backend/pulls` |
| `backend pull` | Fuzzy match → same (if keywords include "pull") |

---

## Template aliases

Templates let one shortcut cover many URLs with a variable parameter.

### Syntax

Add a `urlTemplate` field to your shortcut that includes `{variable}` as a placeholder. The bare `url` field is used as the fallback when you type the trigger alone.

```json
{
  "id": "yt",
  "trigger": "yt",
  "url": "https://www.youtube.com",
  "urlTemplate": "https://www.youtube.com/results?search_query={variable}",
  "description": "YouTube",
  "newTab": true
}
```

| You type | Result |
|---|---|
| `yt` | `https://www.youtube.com` (bare URL) |
| `yt tony stark` | `https://www.youtube.com/results?search_query=tony%20stark` |
| `yt cats` | `https://www.youtube.com/results?search_query=cats` |

### How it works

1. When you type `trigger value`, the palette matches the longest trigger prefix and treats the rest as the variable value.
2. The value is URL-encoded and substituted for every `{variable}` in the template.
3. If you type just the trigger (no value), the bare `url` is opened instead.
4. Multi-word triggers (e.g. `backend-pull`) are supported — `backend pull 123` matches `backend-pull` with value `123`.

### Validation

- A `urlTemplate` must contain `{variable}` to be saved.
- At most one variable placeholder is allowed.

---

## Storage

Aliases live in `chrome.storage.sync` under key `aliases: UrlAlias[]`.

### Limits

- Chrome sync storage: **100 KB total**, **8 KB per item**
- Practical limit: ~200–500 aliases depending on URL length

For large alias sets, fall back to `chrome.storage.local` + export/import JSON.

---

## Default seed aliases

On first install, these are written from `src/data/default-aliases.ts`:

| Trigger | URL |
|---|---|
| `backend-pull` | `https://github.com/memora/backend/pulls` |
| `backend-issues` | `https://github.com/memora/backend/issues` |

Edit `default-aliases.ts` or the Options page after install.

---

## Import / export (Phase 4)

```json
{
  "version": 1,
  "aliases": [
    {
      "id": "uuid",
      "trigger": "backend-pull",
      "url": "https://github.com/memora/backend/pulls",
      "description": "Backend PRs",
      "keywords": ["github"],
      "enabled": true
    }
  ]
}
```

---

## Validation

Before saving an alias:

1. `trigger` — non-empty, no leading/trailing spaces, unique among enabled aliases
2. `url` — valid URL with allowed scheme (`https:`, `http:`)
3. `id` — UUID v4

Rejected: `javascript:`, `data:`, and other dangerous schemes.

---

## Ideas for your workflow

Add aliases as we go. Some starters:

```
trigger: backend-pull    → github.com/memora/backend/pulls
trigger: backend-repo    → github.com/memora/backend
trigger: memora           → github.com/memora
trigger: linear           → linear.app/team/…
trigger: vercel-backend   → vercel.com/…/backend
trigger: staging          → staging.memora.com
```

Share your list and we'll add them to the seed file.
