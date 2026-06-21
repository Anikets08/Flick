import type { CommandAction } from '@/types';

async function getTab(tabId: number) {
  return browser.tabs.get(tabId);
}

async function screenshot(tabId: number): Promise<void> {
  // Hide the Flick palette before capturing so the overlay isn't included in
  // the screenshot.
  try {
    await browser.tabs.sendMessage(tabId, { type: 'FLICK_HIDE' });
  } catch {
    // Palette may already be closed or the content script may be unavailable.
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const tab = await getTab(tabId);
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  const timestamp = Date.now();
  await browser.downloads.download({
    url: dataUrl,
    filename: `screenshot-${timestamp}.png`,
    saveAs: false,
  });
}

async function toggleDarkMode(tabId: number): Promise<boolean> {
  const results = await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      const id = 'flick-dark-mode';
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
        return false;
      }
      const style = document.createElement('style');
      style.id = id;
      style.textContent = [
        'body { background: oklch(0.11 0.003 260) !important; }',
        'body > :not([data-flick-host]) { filter: invert(1) hue-rotate(180deg) !important; }',
        'body > :not([data-flick-host]) img:not([src^="data:"]),',
        'body > :not([data-flick-host]) video,',
        'body > :not([data-flick-host]) canvas,',
        'body > :not([data-flick-host]) svg,',
        'body > :not([data-flick-host]) [role="img"],',
        'body > :not([data-flick-host]) iframe {',
        '  filter: invert(1) hue-rotate(180deg) !important;',
        '}',
      ].join('\n');
      document.documentElement.appendChild(style);
      return true;
    },
  });
  return results[0]?.result ?? false;
}

async function clearCache(tabId: number): Promise<void> {
  await browser.browsingData.removeCache({ since: 0 });
  await browser.tabs.reload(tabId);
}

async function showGrid(tabId: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      const id = 'flick-grid-overlay';
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
        return;
      }
      const overlay = document.createElement('div');
      overlay.id = id;
      overlay.style.cssText = [
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
        'z-index: 2147483646; pointer-events: none;',
        'display: flex; justify-content: center;',
        'background: repeating-linear-gradient(',
        '  90deg,',
        '  rgba(255, 80, 80, 0.12) 0px,',
        '  rgba(255, 80, 80, 0.12) calc((100% - 11 * 24px) / 12),',
        '  transparent calc((100% - 11 * 24px) / 12),',
        '  transparent calc((100% - 11 * 24px) / 12 + 24px)',
        ');',
      ].join('');
      document.documentElement.appendChild(overlay);
    },
  });
}

async function showRulers(tabId: number): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      const id = 'flick-rulers';
      const existing = document.getElementById(id);
      if (existing) {
        existing.remove();
        return;
      }
      const container = document.createElement('div');
      container.id = id;
      container.style.cssText = [
        'position: fixed; top: 0; left: 0; z-index: 2147483646;',
        'pointer-events: none; font: 9px/1 monospace; color: #ccc;',
      ].join('');

      const hRuler = document.createElement('div');
      hRuler.style.cssText = [
        'position: fixed; top: 0; left: 0; height: 20px; width: 100%;',
        'background: rgba(0,0,0,0.75); display: flex; align-items: flex-end;',
        'border-bottom: 1px solid rgba(255,255,255,0.2);',
      ].join('');
      for (let i = 0; i <= 200; i++) {
        const mark = document.createElement('span');
        mark.style.cssText = [
          'position: absolute;',
          `left: ${i * 50}px;`,
          i % 2 === 0 ? 'height: 14px; border-left: 1px solid rgba(255,255,255,0.5);' : 'height: 6px; border-left: 1px solid rgba(255,255,255,0.3);',
        ].join('');
        if (i % 4 === 0) {
          mark.style.fontSize = '8px';
          mark.style.paddingLeft = '2px';
          mark.style.color = 'rgba(255,255,255,0.7)';
          mark.style.lineHeight = '16px';
          mark.textContent = `${i * 50}`;
        }
        hRuler.appendChild(mark);
      }

      const vRuler = document.createElement('div');
      vRuler.style.cssText = [
        'position: fixed; top: 0; left: 0; width: 20px; height: 100%;',
        'background: rgba(0,0,0,0.75); display: flex; flex-direction: column;',
        'align-items: flex-end; border-right: 1px solid rgba(255,255,255,0.2);',
      ].join('');
      for (let i = 0; i <= 200; i++) {
        const mark = document.createElement('span');
        mark.style.cssText = [
          'position: absolute;',
          `top: ${i * 50}px;`,
          i % 2 === 0 ? 'width: 14px; border-top: 1px solid rgba(255,255,255,0.5);' : 'width: 6px; border-top: 1px solid rgba(255,255,255,0.3);',
        ].join('');
        if (i % 4 === 0) {
          mark.style.writingMode = 'vertical-lr';
          mark.style.fontSize = '8px';
          mark.style.paddingTop = '2px';
          mark.style.color = 'rgba(255,255,255,0.7)';
          mark.textContent = `${i * 50}`;
        }
        vRuler.appendChild(mark);
      }

      container.appendChild(hRuler);
      container.appendChild(vRuler);
      document.documentElement.appendChild(container);
    },
  });
}

async function duplicateTab(tabId: number): Promise<void> {
  await browser.tabs.duplicate(tabId);
}

async function pinTab(tabId: number): Promise<void> {
  const tab = await getTab(tabId);
  await browser.tabs.update(tabId, { pinned: !tab.pinned });
}

async function muteTab(tabId: number): Promise<void> {
  const tab = await getTab(tabId);
  await browser.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
}

async function moveToNewWindow(tabId: number): Promise<void> {
  await browser.tabs.move(tabId, { windowId: -1, index: -1 });
}

async function bookmarkPage(tabId: number): Promise<void> {
  const tab = await getTab(tabId);
  await browser.bookmarks.create({ title: tab.title, url: tab.url });
}

export async function showToast(tabId: number, message: string): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: (msg: string) => {
      const existing = document.getElementById('flick-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.id = 'flick-toast';
      toast.textContent = msg;
      toast.style.cssText = [
        'position: fixed',
        'bottom: 24px',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 2147483647',
        'background: oklch(0.16 0.01 260)',
        'color: oklch(0.95 0 0)',
        'padding: 10px 20px',
        'border-radius: 10px',
        'border: 1px solid oklch(0.3 0.01 260 / 0.5)',
        'font: 14px/1.4 ui-sans-serif, system-ui, sans-serif',
        'box-shadow: 0 8px 32px rgba(0,0,0,0.5)',
        'opacity: 0',
        'transition: opacity 0.2s ease',
        'pointer-events: none',
      ].join('; ');
      document.body.append(toast);

      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
      }, 1800);
    },
    args: [message],
  });
}

async function pasteSnippet(tabId: number, text: string): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: (content: string) => {
      const el = document.createElement('textarea');
      el.value = content;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    },
    args: [text],
  });
}

async function copyToClipboard(tabId: number, value: 'url' | 'title' | 'markdown-link'): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: (type: 'url' | 'title' | 'markdown-link') => {
      const copy = (text: string) => {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        el.remove();
      };

      if (type === 'url') {
        copy(window.location.href);
      } else if (type === 'title') {
        copy(document.title);
      } else if (type === 'markdown-link') {
        copy(`[${document.title}](${window.location.href})`);
      }
    },
    args: [value],
  });
}

export async function executeAction(
  action: CommandAction,
  currentTabId?: number,
): Promise<void> {
  const tabId = currentTabId;

  switch (action.type) {
    case 'navigate': {
      if (action.newTab) {
        await browser.tabs.create({ url: action.url });
        return;
      }
      if (tabId != null) {
        await browser.tabs.update(tabId, { url: action.url });
        return;
      }
      await browser.tabs.create({ url: action.url });
      return;
    }
    case 'switch-tab':
      await browser.tabs.update(action.tabId, { active: true });
      return;
    case 'close-tab':
      await browser.tabs.remove(action.tabId);
      return;
    case 'screenshot': {
      if (tabId == null) return;
      if (action.mode === 'select-element') {
        await browser.tabs.sendMessage(tabId, { type: 'ENTER_ELEMENT_SELECTION' });
        return;
      }
      await screenshot(tabId);
      void showToast(tabId, 'Screenshot saved to Downloads');
      return;
    }
    case 'copy': {
      if (tabId == null) return;
      await copyToClipboard(tabId, action.value);
      const label = action.value === 'markdown-link' ? 'Markdown link' : action.value === 'title' ? 'Title' : 'URL';
      void showToast(tabId, `${label} copied to clipboard`);
      return;
    }
    case 'toggle-dark-mode': {
      if (tabId == null) return;
      const enabled = await toggleDarkMode(tabId);
      void showToast(tabId, enabled ? 'Dark mode on' : 'Dark mode off');
      return;
    }
    case 'clear-cache': {
      if (tabId == null) return;
      void showToast(tabId, 'Cache cleared, reloading…');
      await clearCache(tabId);
      return;
    }
    case 'show-grid': {
      if (tabId == null) return;
      await showGrid(tabId);
      void showToast(tabId, 'Grid toggled');
      return;
    }
    case 'show-rulers': {
      if (tabId == null) return;
      await showRulers(tabId);
      void showToast(tabId, 'Rulers toggled');
      return;
    }
    case 'duplicate-tab': {
      if (tabId == null) return;
      void showToast(tabId, 'Tab duplicated');
      await duplicateTab(tabId);
      return;
    }
    case 'pin-tab': {
      if (tabId == null) return;
      await pinTab(tabId);
      void showToast(tabId, 'Tab pinned / unpinned');
      return;
    }
    case 'mute-tab': {
      if (tabId == null) return;
      await muteTab(tabId);
      void showToast(tabId, 'Tab muted / unmuted');
      return;
    }
    case 'move-to-new-window': {
      if (tabId == null) return;
      void showToast(tabId, 'Moving tab to new window…');
      await moveToNewWindow(tabId);
      return;
    }
    case 'paste-snippet': {
      if (tabId == null) return;
      await pasteSnippet(tabId, action.text);
      void showToast(tabId, `${action.label} copied to clipboard`);
      return;
    }
    case 'bookmark-page': {
      if (tabId == null) return;
      await bookmarkPage(tabId);
      void showToast(tabId, 'Page bookmarked');
      return;
    }
    case 'color-picker': {
      if (tabId == null) return;
      await browser.tabs.sendMessage(tabId, { type: 'ENTER_COLOR_PICKER' });
      return;
    }
    case 'custom':
      console.warn('[Flick] Action not implemented yet:', action.type);
      return;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
