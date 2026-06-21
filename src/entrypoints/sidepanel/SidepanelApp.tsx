import { useEffect, useState } from 'react';
import { FlickShell } from '@/components/FlickShell';

function isHttpUrl(url?: string): boolean {
  return !!url && /^https?:\/\//.test(url);
}

export function SidepanelApp() {
  const [activeTabId, setActiveTabId] = useState<number | undefined>();

  useEffect(() => {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setActiveTabId(tab?.id))
      .catch(() => {});
  }, []);

  // Auto-close the side panel when the active tab navigates to a normal
  // http(s) page — the content-script overlay takes over there.
  useEffect(() => {
    const onUpdated = (_tabId: number, info: browser.tabs.OnUpdatedChangeInfo, tab: browser.tabs.Tab) => {
      if (tab.active && isHttpUrl(info.url)) {
        window.close();
      }
    };
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => browser.tabs.onUpdated.removeListener(onUpdated);
  }, []);

  const handleClose = () => {
    window.close();
  };

  if (activeTabId == null) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--flick-muted)]">
        <span>Could not identify the active tab.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <FlickShell
        onClose={handleClose}
        isPopup
        activeTabId={activeTabId}
      />
    </div>
  );
}
