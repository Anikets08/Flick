import { useEffect } from 'react';

function getFlickHost(): HTMLElement | null {
  for (const child of document.body.children) {
    if (
      child instanceof HTMLElement &&
      child.shadowRoot?.getElementById('flick-root')
    ) {
      return child;
    }
  }
  return null;
}

function isInsideFlick(target: EventTarget | null, host: HTMLElement): boolean {
  if (!(target instanceof Node)) return false;
  return host === target || host.shadowRoot?.contains(target) === true;
}

/**
 * While Flick is open: blur the page, mark siblings inert, and stop keyboard
 * events from reaching the host page (e.g. GitHub's "/" search shortcut).
 *
 * Listeners are attached to `window` in the capture phase — the earliest
 * interception point — so page-level handlers on `document`/`window` never
 * see the event.  Events originating inside the Shadow DOM are retargeted
 * to the host and allowed through; `stopBubbleToPage` then prevents them
 * from bubbling back to the page.
 */
export function useBlockPageInteraction(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const host = getFlickHost();
    if (!host) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    if (previousFocus && !isInsideFlick(previousFocus, host)) {
      previousFocus.blur();
    }

    const inerted = new Set<Element>();
    const inertSiblings = () => {
      for (const child of document.body.children) {
        if (child !== host && !inerted.has(child)) {
          child.setAttribute('inert', '');
          inerted.add(child);
        }
      }
    };
    inertSiblings();

    const blockOutside = (event: Event) => {
      if (isInsideFlick(event.target, host)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const stopBubbleToPage = (event: Event) => {
      if (isInsideFlick(event.target, host)) event.stopPropagation();
    };

    const keyboardEvents = [
      'keydown',
      'keypress',
      'keyup',
      'beforeinput',
      'input',
    ] as const;

    for (const type of keyboardEvents) {
      document.addEventListener(type, blockOutside, true);
      host.addEventListener(type, stopBubbleToPage);
    }

    const onFocusIn = (event: FocusEvent) => {
      if (isInsideFlick(event.target, host)) return;
      const input = host.shadowRoot?.querySelector('input');
      if (input instanceof HTMLElement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestAnimationFrame(() => input.focus());
      }
    };
    document.addEventListener('focusin', onFocusIn, true);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const input = host.shadowRoot?.querySelector('input');
      if (input instanceof HTMLElement) input.focus();
    });

    const observer = new MutationObserver(inertSiblings);
    observer.observe(document.body, { childList: true });

    return () => {
      for (const type of keyboardEvents) {
        window.removeEventListener(type, blockOutside, true);
        host.removeEventListener(type, stopBubbleToPage);
      }

      document.removeEventListener('focusin', onFocusIn, true);
      observer.disconnect();

      inerted.forEach((element) => element.removeAttribute('inert'));
      document.body.style.overflow = previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [active]);
}
