import '@/assets/styles/globals.css';
import { createRoot, type Root } from 'react-dom/client';
import { StrictMode } from 'react';
import { FlickShell } from '@/components/FlickShell';

function startColorPicker(): void {
  const tearDropSvg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="28" viewBox="0 0 24 28">',
    '<path d="M12 2C12 2 2 14 2 20C2 25 7 27 12 27C17 27 22 25 22 20C22 14 12 2 12 2Z"',
    'fill="white" stroke="#222" stroke-width="1.5"/>',
    '<path d="M12 6C12 6 5 15 5 20C5 23 8 24 12 24C16 24 19 23 19 20C19 15 12 6 12 6Z"',
    'fill="#ddd" stroke="#888" stroke-width="0.5"/>',
    '</svg>',
  ].join('\n');

  const cursorStyle = document.createElement('style');
  cursorStyle.id = 'flick-picker-cursor';
  cursorStyle.textContent = [
    `* { cursor: url("data:image/svg+xml,${encodeURIComponent(tearDropSvg)}") 12 2, crosshair !important; }`,
  ].join('');
  document.documentElement.appendChild(cursorStyle);

  const tooltip = document.createElement('div');
  tooltip.id = 'flick-picker-tooltip';
  tooltip.style.cssText = [
    'position: fixed',
    'z-index: 2147483647',
    'pointer-events: none',
    'display: none',
    'align-items: center',
    'gap: 6px',
    'background: oklch(0.16 0.01 260)',
    'color: oklch(0.95 0 0)',
    'font: 11px/1 ui-monospace, monospace',
    'padding: 5px 10px',
    'border-radius: 8px',
    'border: 1px solid oklch(0.3 0.01 260 / 0.5)',
    'box-shadow: 0 4px 12px rgba(0,0,0,0.4)',
  ].join('; ');

  const swatch = document.createElement('span');
  swatch.style.cssText = [
    'display: inline-block',
    'width: 10px',
    'height: 10px',
    'border-radius: 3px',
    'border: 1px solid rgba(255,255,255,0.15)',
    'flex-shrink: 0',
  ].join('; ');

  const hexText = document.createElement('span');
  hexText.textContent = '\u2014';

  tooltip.append(swatch, hexText);
  document.body.append(tooltip);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const dpr = window.devicePixelRatio;

  let active = true;
  let captured = false;

  const initCapture = async () => {
    try {
      const dataUrl = await browser.runtime.sendMessage({ type: 'CAPTURE_ELEMENT', rect: { x: 0, y: 0, width: 0, height: 0 }, dpr: 1 });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      captured = true;
    } catch {
      // Page capture failed; color will not preview but clicking still attempts
    }
  };

  void initCapture();

  const getHexAt = (x: number, y: number): string | null => {
    if (!captured) return null;
    const data = ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data;
    const [r, g, b] = data;
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  };

  const updateTooltip = (e: MouseEvent) => {
    if (!active) return;
    const hex = getHexAt(e.clientX, e.clientY);
    if (!hex) {
      tooltip.style.display = 'none';
      return;
    }
    swatch.style.background = hex;
    hexText.textContent = hex;
    tooltip.style.display = 'flex';
    tooltip.style.left = `${e.clientX + 16}px`;
    tooltip.style.top = `${Math.max(4, e.clientY - 42)}px`;
  };

  const onClick = async (e: MouseEvent) => {
    if (!active) return;
    const target = e.target as Element;
    if (target.closest('[data-flick-host]')) return;
    e.preventDefault();
    e.stopPropagation();
    active = false;
    cleanup();

    const hex = getHexAt(e.clientX, e.clientY) ?? '#000000';

    const el = document.createElement('textarea');
    el.value = hex;
    el.style.cssText = 'position: fixed; opacity: 0; pointer-events: none;';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();

    await browser.runtime.sendMessage({ type: 'SHOW_TOAST', message: `Copied ${hex}` });
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
    cursorStyle.remove();
    tooltip.remove();
    document.removeEventListener('mousemove', updateTooltip, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };

  document.addEventListener('mousemove', updateTooltip, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

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
          name: 'flick-palette',
          position: 'overlay',
          anchor: 'body',
          onMount(uiContainer, _shadow, shadowHost) {
            shadowHost.setAttribute('data-flick-host', '');

            // Host pages may set a custom root font-size (e.g. YouTube uses
            // 10px). Since `rem` units inside a shadow root still resolve
            // against the document root, we scale the internal <html> so Flick
            // always renders at a 16px base font-size.
            const rootFontSize = parseFloat(
              getComputedStyle(document.documentElement).fontSize,
            );
            const scale =
              Number.isFinite(rootFontSize) && rootFontSize > 0
                ? 16 / rootFontSize
                : 1;
            const innerHtml = _shadow.querySelector('html');
            if (innerHtml) {
              innerHtml.style.setProperty('--flick-scale', String(scale));
            }

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
        return false;
      }
      if (message?.type === 'FLICK_HIDE') {
        close();
        return false;
      }
      if (message?.type === 'ENTER_ELEMENT_SELECTION') {
        close();
        startElementSelection();
        return false;
      }
      if (message?.type === 'ENTER_COLOR_PICKER') {
        close();
        startColorPicker();
        return false;
      }
      return false;
    });
  },
});
