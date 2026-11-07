import { executeAction, showToast } from '@/lib/actions/execute-action';
import { listTabs, searchBrowser } from '@/lib/search/browser-search';
import { getAllAliases, saveAliases } from '@/lib/storage/aliases';
import { isRestrictedTabUrl, openFlickOnActiveTab, openFlickSidePanel } from '@/lib/open-flick';
import type { CommandAction } from '@/types';

export default defineBackground(() => {
  // ── Active tab tracking ──────────────────────────────────────────────
  // sidePanel.open() requires a user gesture, and any `await` invalidates
  // it. We cache the active tab's URL synchronously via event listeners so
  // the command handler can decide whether to open the side panel WITHOUT
  // awaiting anything first.
  let activeTabId: number | undefined;
  let activeTabUrl: string | undefined;
  // Tracks the tab we opened the side panel on (via keyboard shortcut on a
  // restricted page). Used to auto-close the panel when the tab navigates to
  // a normal http(s) page, where the content-script overlay takes over.
  let sidePanelTabId: number | undefined;

  const refreshActiveTab = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      activeTabId = tab?.id;
      activeTabUrl = tab?.url;
    } catch {
      // ignore — will retry on next tab activation
    }
  };

  // Seed the cache when the service worker starts.
  void refreshActiveTab();

  browser.tabs.onActivated.addListener((info) => {
    activeTabId = info.tabId;
    // Clear the URL immediately — it's fetched async below. While undefined,
    // isRestrictedTabUrl() returns true, so the command handler will take the
    // synchronous side-panel path (safe default) instead of the async path
    // that loses the user gesture.
    activeTabUrl = undefined;
    void browser.tabs
      .get(info.tabId)
      .then((tab) => {
        activeTabUrl = tab.url;
      })
      .catch(() => {});
  });

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (tab.active && info.url) {
      activeTabId = tabId;
      activeTabUrl = info.url;

      // Auto-close the side panel when the tracked tab navigates to a
      // normal http(s) page — the content-script overlay takes over there.
      if (sidePanelTabId === tabId && /^https?:\/\//.test(info.url)) {
        chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
        sidePanelTabId = undefined;
      }
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    if (sidePanelTabId === tabId) sidePanelTabId = undefined;
  });

  // ── Command handler ──────────────────────────────────────────────────
  browser.commands.onCommand.addListener((command) => {
    if (command !== 'open-flick') return;

    // SYNCHRONOUS path — no `await` before this point, so the user gesture
    // from the keyboard shortcut is still valid for sidePanel.open().
    if (isRestrictedTabUrl(activeTabUrl)) {
      if (activeTabId != null) {
        openFlickSidePanel(activeTabId);
        sidePanelTabId = activeTabId;
      } else {
        // Cache not ready yet (first press after service-worker startup).
        // Open for the current window — the side panel will query the
        // active tab itself via tabs.query().
        chrome.sidePanel
          .open({ windowId: chrome.windows.WINDOW_ID_CURRENT })
          .catch((error) => console.warn('[Flick] Side panel open failed:', error));
      }
      return;
    }

    // Normal page (URL cached and not restricted) — async content-script flow.
    void openFlickOnActiveTab().then((result) => {
      if (!result.ok) console.warn('[Flick]', result.reason);
    });
  });

  browser.action.onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });

  const handleMessage = async (
    message: any,
    sender: Browser.runtime.MessageSender,
  ): Promise<unknown> => {
    switch (message?.type) {
      case 'EXECUTE_ACTION': {
        const action = message.action as CommandAction;
        const tabId = message.tabId ?? sender.tab?.id;
        void executeAction(action, tabId);
        return true;
      }

      case 'LIST_TABS':
        return listTabs(message.excludeTabId ?? sender.tab?.id);

      case 'SEARCH_BROWSER':
        return searchBrowser(message.query as string);

      case 'CAPTURE_ELEMENT': {
        if (!sender.tab?.id) return undefined;
        const tab = await browser.tabs.get(sender.tab.id);
        return browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      }

      case 'DOWNLOAD_ELEMENT': {
        const timestamp = Date.now();
        await browser.downloads.download({
          url: message.dataUrl,
          filename: `element-screenshot-${timestamp}.png`,
          saveAs: false,
        });
        return true;
      }

      case 'SHOW_TOAST':
        if (sender.tab?.id) void showToast(sender.tab.id, message.message as string);
        return undefined;

      case 'OPEN_OPTIONS':
        void browser.runtime.openOptionsPage();
        return undefined;

      default:
        return undefined;
    }
  };

  // Reply via sendResponse + `return true` rather than returning a promise —
  // promise-returning listeners aren't supported on every Chrome version.
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse, (error) => {
      console.error('[Flick]', error);
      sendResponse(undefined);
    });
    return true;
  });

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'install') return;

    // Sync storage may already hold shortcuts from another device.
    if ((await getAllAliases()).length) return;
    const { DEFAULT_ALIASES } = await import('@/data/default-aliases');
    await saveAliases(DEFAULT_ALIASES);
  });
});
