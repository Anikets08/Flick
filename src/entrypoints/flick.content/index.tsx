import '@/assets/styles/globals.css';
import { createRoot, type Root } from 'react-dom/client';
import { StrictMode } from 'react';
import { FlickShell } from '@/components/FlickShell';

function startElementSelection(): void {
  const overlay = document.createElement('div');
  overlay.id = 'flick-element-highlight';
  overlay.style.cssText = [
    'position: fixed',
    'z-index: 2147483646',
    'pointer-events: none',
    'border: 2px solid #6366f1',
    'background: rgba(99, 102, 241, 0.08)',
    'outline: 1px solid rgba(99, 102, 241, 0.3)',
    'display: none',
  ].join('; ');

  const info = document.createElement('div');
  info.id = 'flick-element-info';
  info.style.cssText = [
    'position: fixed',
    'z-index: 2147483647',
    'pointer-events: none',
    'background: #1e1b4b',
    'color: #e0e7ff',
    'font: 11px/1.2 ui-monospace, monospace',
    'padding: 3px 8px',
    'border-radius: 4px',
    'border: 1px solid #6366f1',
    'display: none',
    'white-space: nowrap',
  ].join('; ');

  document.body.append(overlay, info);

  const cursorStyle = document.createElement('style');
  cursorStyle.id = 'flick-element-cursor';
  cursorStyle.textContent = '* { cursor: crosshair !important; }';
  document.documentElement.appendChild(cursorStyle);

  const getElementInfo = (el: Element): string => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = Array.from((el as HTMLElement).classList)
      .slice(0, 2)
      .map((c) => (c.includes(' ') ? `.${c.split(' ')[0]}` : `.${c}`))
      .join('');
    return `${tag}${id}${cls}`;
  };

  const updateOverlay = (target: Element) => {
    const rect = target.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const label = getElementInfo(target);
    info.textContent = label;
    info.style.display = 'block';
    const infoTop = rect.top - 22;
    info.style.top = `${infoTop < 0 ? rect.top + 4 : infoTop}px`;
    info.style.left = `${rect.left}px`;
  };

  const hideOverlay = () => {
    overlay.style.display = 'none';
    info.style.display = 'none';
  };

  let active = true;

  const onMouseOver = (e: MouseEvent) => {
    if (!active) return;
    const target = e.target as Element;
    if (target.closest('[data-flick-host]')) return;
    updateOverlay(target);
  };

  const onMouseOut = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-flick-host]')) return;
    const related = e.relatedTarget as Element | null;
    if (related && overlay.contains(related)) return;
    hideOverlay();
  };

  const onClick = async (e: MouseEvent) => {
    if (!active) return;
    const target = e.target as Element;
    if (target.closest('[data-flick-host]')) return;
    e.preventDefault();
    e.stopPropagation();

    active = false;
    cleanup();
    info.remove();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const rect = target.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    try {
      const fullPageDataUrl = await browser.runtime.sendMessage({
        type: 'CAPTURE_ELEMENT',
        rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
        dpr,
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = fullPageDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        rect.left * dpr,
        rect.top * dpr,
        rect.width * dpr,
        rect.height * dpr,
        0,
        0,
        rect.width * dpr,
        rect.height * dpr,
      );

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const croppedDataUrl = `data:image/png;base64,${btoa(binary)}`;

      await browser.runtime.sendMessage({
        type: 'DOWNLOAD_ELEMENT',
        dataUrl: croppedDataUrl,
      });
    } catch (err) {
      console.error('[Flick] Element capture failed:', err);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      active = false;
      cleanup();
    }
  };

  const cleanup = () => {
    overlay.remove();
    info.remove();
    cursorStyle.remove();
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  main(ctx) {
    let root: Root | undefined;
    let isOpen = false;
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | undefined;

    const close = () => {
      if (!isOpen || !ui) return;
      ui.remove();
      isOpen = false;
    };

    const open = async () => {
      if (isOpen) return;

      if (!ui) {
        ui = await createShadowRootUi(ctx, {
          name: 'flick',
          position: 'overlay',
          anchor: 'body',
          onMount(uiContainer, _shadow, shadowHost) {
            shadowHost.setAttribute('data-flick-host', '');
            const app = document.createElement('div');
            app.id = 'flick-root';
            uiContainer.append(app);
            root = createRoot(app);
            root.render(
              <StrictMode>
                <FlickShell onClose={close} />
              </StrictMode>,
            );
            return root;
          },
          onRemove(mountedRoot) {
            mountedRoot?.unmount();
            root = undefined;
          },
        });
      }

      ui.mount();
      isOpen = true;
    };

    const toggle = async () => {
      if (isOpen) close();
      else await open();
    };

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === 'FLICK_TOGGLE') {
        void toggle();
        return true;
      }
      if (message?.type === 'FLICK_HIDE') {
        close();
        return true;
      }
      if (message?.type === 'ENTER_ELEMENT_SELECTION') {
        close();
        startElementSelection();
        return true;
      }
      return false;
    });
  },
});
