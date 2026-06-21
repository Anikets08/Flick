const RESTRICTED_URL_PREFIXES = ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'devtools://'];

export function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return true;
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function toggleFlickOnTab(tabId: number): Promise<void> {
  await browser.tabs.sendMessage(tabId, { type: 'FLICK_TOGGLE' });
}

export async function openFlickOnActiveTab(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    return { ok: false, reason: 'No active tab found.' };
  }

  if (isRestrictedTabUrl(tab.url)) {
    return {
      ok: false,
      reason: 'Flick cannot run on chrome:// pages or the Web Store. Open a normal website first.',
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
