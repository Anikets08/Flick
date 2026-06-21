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
    // The content script may not be loaded yet (e.g. the tab was already open
    // when the extension was installed/updated, or it was invalidated). Inject
    // it on demand and retry once.
    if (isMissingReceiverError(error)) {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['/content-scripts/flick.js'],
      });
      // Brief delay so the injected script can initialise its listener.
      await new Promise((resolve) => setTimeout(resolve, 50));
      await browser.tabs.sendMessage(tabId, { type: 'FLICK_TOGGLE' });
      return;
    }
    throw error;
  }
}

export async function openFlickOnActiveTab(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return { ok: false, reason: 'No active tab found.' };
  }

  if (isRestrictedTabUrl(tab.url)) {
    return {
      ok: false,
      reason: 'Flick cannot run on chrome:// pages, the Web Store, or restricted pages. Open a normal website first.',
    };
  }

  try {
    await toggleFlickOnTab(tab.id);
    return { ok: true };
  } catch (error) {
    console.error('[Flick] Failed to open palette:', error);
    return {
      ok: false,
      reason: 'Could not reach the page. Reload the tab and try again.',
    };
  }
}
