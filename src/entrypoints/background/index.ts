import { executeAction, showToast } from '@/lib/actions/execute-action';
import { listTabs, searchBrowser } from '@/lib/search/browser-search';
import { getOpenShortcut, OPEN_FLICK_COMMAND, openShortcutSettings } from '@/lib/shortcut';
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

  // ── Opening the palette ─────────────────────────────────────────────
  // Shared by the keyboard shortcut and the toolbar icon. Both grant
  // `activeTab` for the current tab, which is all the access Flick needs.
  const openFlick = (tabId: number | undefined, tabUrl: string | undefined) => {
    // SYNCHRONOUS path — no `await` before this point, so the user gesture
    // is still valid for sidePanel.open().
    if (isRestrictedTabUrl(tabUrl)) {
      if (tabId != null) {
        openFlickSidePanel(tabId);
        sidePanelTabId = tabId;
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

    // Normal page — async content-script flow.
    void openFlickOnActiveTab().then((result) => {
      if (!result.ok) console.warn('[Flick]', result.reason);
    });
  };

  browser.commands.onCommand.addListener((command) => {
    if (command === OPEN_FLICK_COMMAND) openFlick(activeTabId, activeTabUrl);
  });

  // The toolbar icon opens the palette too, so Flick works even when Chrome
  // couldn't assign the keyboard shortcut. Settings stay one click away in
  // the palette footer and the icon's right-click "Options" item.
  browser.action.onClicked.addListener((tab) => {
    openFlick(tab.id, tab.url);
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

      case 'SHOW_TOAST':
        if (sender.tab?.id) void showToast(sender.tab.id, message.message as string);
        return undefined;

      case 'OPEN_OPTIONS':
        void browser.runtime.openOptionsPage();
        return undefined;

      case 'GET_SHORTCUT':
        return getOpenShortcut();

      case 'OPEN_SHORTCUTS':
        void openShortcutSettings();
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
    if (!(await getAllAliases()).length) {
      const { DEFAULT_ALIASES } = await import('@/data/default-aliases');
      await saveAliases(DEFAULT_ALIASES);
    }

    // Welcome page: shows the keyboard shortcut, or how to set one if Chrome
    // couldn't assign it (it silently skips shortcuts already in use).
    await browser.tabs.create({ url: browser.runtime.getURL('/options.html?welcome=1') });
  });
});
