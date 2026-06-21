const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'devtools://',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com',
];

export function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return true;
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isMissingReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Receiving end does not exist') ||
    message.includes('Could not establish connection')
  );
}

export async function toggleFlickOnTab(tabId: number): Promise<void> {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'FLICK_TOGGLE' });
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error;

    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/flick.js'],
      });
    } catch {
      throw new Error('RESTRICTED_PAGE');
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    await browser.tabs.sendMessage(tabId, { type: 'FLICK_TOGGLE' });
  }
}

/**
 * Opens the side panel. MUST be called synchronously (no prior `await`) so the
 * user gesture from the keyboard shortcut is preserved — `sidePanel.open()`
 * requires a user gesture and any `await` invalidates it.
 *
 * Uses `chrome.sidePanel.open()` directly (not the `browser` polyfill) because
 * the polyfill's promise wrapping can insert a microtask that breaks gesture
 * propagation.
 */
export function openFlickSidePanel(tabId: number): void {
  chrome.sidePanel.open({ tabId });
}

export async function openFlickOnActiveTab(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return { ok: false, reason: 'No active tab found.' };
  }

  try {
    await toggleFlickOnTab(tab.id);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'RESTRICTED_PAGE') {
      try {
        await browser.sidePanel.setOptions({
          tabId: tab.id,
          path: 'sidepanel.html',
          enabled: true,
        });
        await browser.sidePanel.open({ tabId: tab.id });
        return { ok: true };
      } catch (sidePanelError) {
        console.error('[Flick] Side panel failed:', sidePanelError);
        return { ok: false, reason: 'Failed to open Flick side panel on this page.' };
      }
    }

    console.error('[Flick] Failed to open palette:', error);
    return {
      ok: false,
      reason: 'Could not reach the page. Reload the tab and try again.',
    };
  }
}
