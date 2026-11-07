import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Flick',
    description: 'A command palette for Chrome — navigate fast, run utilities, and manage shortcuts.',
    permissions: ['storage', 'tabs', 'bookmarks', 'activeTab', 'scripting', 'browsingData', 'downloads', 'sidePanel'],
    // Requested at runtime from Settings → Features so the install prompt
    // doesn't warn about reading browsing history.
    optional_permissions: ['history'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    commands: {
      'open-flick': {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K',
        },
        description: 'Open Flick command palette',
      },
    },
    action: {
      default_title: 'Flick',
    },
  },
  vite: () => ({
    // Preact's React-compat layer: same React code, ~10× smaller runtime.
    // Aliases react/react-dom imports (including cmdk's) to preact/compat.
    plugins: [preact(), tailwindcss()],
  }),
});
