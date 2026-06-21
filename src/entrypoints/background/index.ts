import { executeAction } from '@/lib/actions/execute-action';
import { openFlickOnActiveTab } from '@/lib/open-flick';
import type { CommandAction } from '@/types';

export default defineBackground(() => {
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-flick') return;
    const result = await openFlickOnActiveTab();
    if (!result.ok) {
      console.warn('[Flick]', result.reason);
    }
  });

  browser.action.onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });

  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type === 'EXECUTE_ACTION') {
      const action = message.action as CommandAction;
      void executeAction(action, sender.tab?.id);
      return true;
    }

    if (message?.type === 'CAPTURE_ELEMENT') {
      if (!sender.tab?.id) return false;
      const tab = await browser.tabs.get(sender.tab.id);
      const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      return dataUrl;
    }

    if (message?.type === 'DOWNLOAD_ELEMENT') {
      const timestamp = Date.now();
      await browser.downloads.download({
        url: message.dataUrl,
        filename: `element-screenshot-${timestamp}.png`,
        saveAs: false,
      });
      return true;
    }

    if (message?.type === 'OPEN_OPTIONS') {
      void browser.runtime.openOptionsPage();
      return false;
    }

    return false;
  });

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install') return;

    const result = await browser.storage.sync.get<Record<string, unknown>>('aliases');
    const stored = result.aliases;
    if (!Array.isArray(stored) || !stored.length) {
      const { DEFAULT_ALIASES } = await import('@/data/default-aliases');
      await browser.storage.sync.set({ aliases: DEFAULT_ALIASES });
    }
  });
});
