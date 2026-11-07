import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// E2E builds keep broad host access so Playwright can open the palette without
// a real keyboard shortcut (which is what grants activeTab in production).
const isE2E = process.env.FLICK_E2E === '1';

export default defineConfig({
  srcDir: 'src',
  // Separate folder so the E2E build never replaces the one loaded in Chrome.
  outDir: isE2E ? '.output-e2e' : '.output',
  manifest: {
    name: 'Flick — Command Palette, Tab Search & Shortcuts',
    short_name: 'Flick',
    description:
      'A keyboard command palette for Chrome: search tabs and bookmarks, jump to sites with shortcuts, paste snippets and run page tools.',
    // No host permissions: the shortcut / toolbar click grants `activeTab`,
    // which covers injecting the palette and running tools on that tab.
    // Store justifications for each entry: docs/STORE_LISTING.md.
    permissions: ['storage', 'tabs', 'bookmarks', 'activeTab', 'scripting', 'browsingData', 'sidePanel'],
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
      default_title: 'Open Flick',
    },
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // WXT adds the runtime-registered palette script's `matches` as host
      // permissions. We inject it via activeTab instead, so drop them.
      if (isE2E) {
        manifest.host_permissions = ['<all_urls>'];
      } else {
        delete manifest.host_permissions;
      }
      if (!manifest.content_scripts?.length) delete manifest.content_scripts;
    },
  },
  vite: () => ({
    // Preact, with react/react-dom aliased to preact/compat for the Settings
    // page's React-style code. The palette uses plain Preact.
    plugins: [preact(), tailwindcss()],
  }),
});
