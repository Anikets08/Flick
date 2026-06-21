# Contributing to Flick

Thanks for your interest in contributing. This guide will get you up and running.

## Getting started

```bash
git clone https://github.com/Anikets08/flick.git
cd flick
npm install
npm run dev
```

WXT opens Chrome with the extension loaded and hot-reloading enabled. See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the full dev guide.

## Workflow

1. **Fork & branch** — create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. **Develop** — use `npm run dev` for HMR. Keep changes focused.
3. **Typecheck** — before submitting, ensure it passes:
   ```bash
   npm run compile
   ```
4. **Build** — verify the production build works:
   ```bash
   npm run build
   ```
5. **Pull request** — open a PR with a clear description of what and why.

## Code conventions

- **TypeScript** — strict mode is on. Avoid `any`; use the shared types in `src/types/`.
- **Path aliases** — import from `@/` (maps to `src/`), not relative paths.
- **Styling** — Tailwind CSS 4 utilities. Use the CSS variables defined in `src/assets/styles/globals.css` (`--flick-*`) for theme consistency.
- **Icons** — [Lucide React](https://lucide.dev) only. Tree-shake by importing only what you use.
- **No comments** — keep the code self-documenting. Reserve comments for non-obvious logic only.
- **Naming** — `camelCase` for variables/functions, `PascalCase` for components/types, `kebab-case` for files.

## Architecture notes

- The palette renders in a **closed Shadow DOM** via WXT's `createShadowRootUi`. Host-page CSS cannot leak in or out.
- All privileged actions (`tabs`, `bookmarks`, `captureVisibleTab`, `downloads`) execute in the **background service worker**, triggered via `browser.runtime.sendMessage`.
- The **guard content script** (`flick-guard.content`) runs at `document_start` to intercept keyboard events while the palette is open.
- Search providers return `CommandItem[]` — see `src/types/command.ts` for the action union.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design.

## Adding a new developer tool

1. Add an entry to `src/data/dev-tools.ts` with `id`, `title`, `subtitle`, `keywords`, and `action`.
2. Add the action variant to `CommandAction` in `src/types/command.ts` if it's a new type.
3. Implement the action in `src/lib/actions/execute-action.ts`.
4. Add an icon mapping in both `FlickShell.tsx` (`actionIcon`) and `OptionsApp.tsx` (`devToolIcon`).
5. Optionally add it to a group in `FEATURE_GROUPS` in `OptionsApp.tsx`.

## Adding a new search provider

1. Create `src/lib/search/your-provider.ts` exporting a function that returns `CommandItem[]`.
2. Wire it into `src/hooks/use-flick-search.ts`.
3. Render a new `Command.Group` in `FlickShell.tsx` if it should have its own heading.

## Ideas for contribution

- Tab/bookmark/history search providers
- URL template support (`pr 123` → `.../pull/123`)
- Recent commands
- Theme system (light/dark palette)
- New developer tools (color picker, CSS inspector, console clear)
- Internationalization
- Firefox compatibility testing

## Reporting bugs

Open an issue with:

- Chrome version and OS
- Steps to reproduce
- Expected vs. actual behavior
- Console output from the service worker (`chrome://extensions` → Service worker → Inspect)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
