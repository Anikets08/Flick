/**
 * Early keyboard-event guard.
 *
 * Runs at document_start so its window capture-phase listeners are registered
 * before any page scripts (e.g. GitHub's global "/" shortcut). While Flick
 * is open, any keyboard event whose target is outside the Flick
 * host is cancelled before the host page can see it.
 *
 * "Open" is read from the Flick host's `data-flick-open` attribute rather than
 * tracked via messages, so it can't drift out of sync when the palette closes
 * itself (Esc, backdrop click, running an action). The host stays in the DOM
 * between uses, so its mere presence doesn't mean the palette is showing.
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    const getHost = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('[data-flick-host][data-flick-open]');

    const isInsideFlick = (target: EventTarget | null, host: HTMLElement): boolean => {
      if (!(target instanceof Node)) return false;
      return host === target || host.shadowRoot?.contains(target) === true;
    };

    const blockOutside = (event: Event) => {
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
  },
});
