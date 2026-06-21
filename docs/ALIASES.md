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

## Template aliases (Phase 4)

Templates let one alias cover many URLs with a parameter.

### Syntax (proposed — confirm in roadmap)

```
trigger: pr
urlTemplate: https://github.com/memora/backend/pull/{{number}}
pattern: ^pr\s+(\d+)$
```

| You type | Result |
|---|---|
| `pr 123` | `https://github.com/memora/backend/pull/123` |
| `pr 456` | `https://github.com/memora/backend/pull/456` |

### Alternative syntaxes under consideration

| Style | Example | Pros |
|---|---|---|
| `{{param}}` | `pull/{{number}}` | Readable, Mustache-like |
| `:param` | `pull/:number` | Rails/Express familiar |
| `$1` | `pull/$1` | Regex capture groups |

**Recommendation:** `{{param}}` with explicit regex pattern per alias — clearest for non-technical editing in Options UI.

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
