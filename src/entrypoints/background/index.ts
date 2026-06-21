import { executeAction } from '@/lib/actions/execute-action';
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
        chrome.sidePanel.setOptions({ tabId, enabled: false });
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
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
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

  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type === 'EXECUTE_ACTION') {
      const action = message.action as CommandAction;
      const tabId = message.tabId ?? sender.tab?.id;
      void executeAction(action, tabId);
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
