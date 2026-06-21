/**
 * Early keyboard-event guard.
 *
 * Runs at document_start so its window capture-phase listeners are registered
 * before any page scripts (e.g. GitHub's global "/" shortcut). While Flick
 * is open, any keyboard event whose target is outside the Flick
 * host is cancelled before the host page can see it.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    let isOpen = false;

    const getHost = (): HTMLElement | null => {
      if (!document.body) return null;
      for (const child of document.body.children) {
        if (
          child instanceof HTMLElement &&
          child.shadowRoot?.getElementById('flick-root')
        ) {
          return child;
        }
      }
      return null;
    };

    const isInsideFlick = (target: EventTarget | null, host: HTMLElement): boolean => {
      if (!(target instanceof Node)) return false;
      return host === target || host.shadowRoot?.contains(target) === true;
    };

    const blockOutside = (event: Event) => {
      if (!isOpen) return;
      const host = getHost();
      if (!host) return;
      if (isInsideFlick(event.target, host)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const keyboardEvents = ['keydown', 'keypress', 'keyup', 'beforeinput', 'input'] as const;

    for (const type of keyboardEvents) {
      window.addEventListener(type, blockOutside, true);
    }

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === 'FLICK_TOGGLE') {
        isOpen = !isOpen;
        return false;
      }
      if (message?.type === 'FLICK_HIDE') {
        isOpen = false;
        return false;
      }
      return false;
    });
  },
});
