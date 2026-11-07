/** Name of the "open the palette" command in the manifest. */
export const OPEN_FLICK_COMMAND = 'open-flick';

/** Chrome's page for assigning extension shortcuts. Only extension pages and the background can open it. */
export const SHORTCUTS_PAGE_URL = 'chrome://extensions/shortcuts';

/**
 * The key combination currently assigned to open Flick (e.g. "⇧⌘K"), or ''
 * when none is set. Chrome silently skips the suggested shortcut at install if
 * another extension already uses it, so this can be empty on a fresh install.
 * Not available in content scripts — ask the background with `GET_SHORTCUT`.
 */
export async function getOpenShortcut(): Promise<string> {
  const commands = await browser.commands.getAll();
  return commands.find((command) => command.name === OPEN_FLICK_COMMAND)?.shortcut ?? '';
}

export async function openShortcutSettings(): Promise<void> {
  await browser.tabs.create({ url: SHORTCUTS_PAGE_URL });
}
