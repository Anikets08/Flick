import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'Flick',
    description: 'A command palette for Chrome — navigate fast, run utilities, and manage shortcuts.',
    permissions: ['storage', 'tabs', 'bookmarks', 'history', 'activeTab', 'scripting', 'browsingData', 'downloads', 'sidePanel'],
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
    plugins: [tailwindcss()],
  }),
});
