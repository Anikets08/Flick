import { Command } from 'cmdk';
import {
  Bookmark,
  Camera,
  Clipboard,
  Copy,
  Crosshair,
  ExternalLink,
  Grid3x3,
  Link2,
  Maximize2,
  Moon,
  Pin,
  Ruler,
  Settings,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useBlockPageInteraction } from '@/hooks/use-block-page-interaction';
import { useFlickSearch } from '@/hooks/use-flick-search';
import { cn } from '@/lib/cn';
import type { CommandItem } from '@/types';

interface FlickShellProps {
  onClose: () => void;
  isPopup?: boolean;
  activeTabId?: number;
}

function openSettings(): void {
  void browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
}

const actionIcon = (item: CommandItem) => {
  switch (item.action.type) {
    case 'navigate':
      return item.action.newTab ? <ExternalLink className="size-4" /> : <Link2 className="size-4" />;
    case 'screenshot':
      return item.action.mode === 'select-element' ? <Crosshair className="size-4" /> : <Camera className="size-4" />;
    case 'toggle-dark-mode':
      return <Moon className="size-4" />;
    case 'clear-cache':
      return <Trash2 className="size-4" />;
    case 'show-grid':
      return <Grid3x3 className="size-4" />;
    case 'show-rulers':
      return <Ruler className="size-4" />;
    case 'duplicate-tab':
      return <Copy className="size-4" />;
    case 'pin-tab':
      return <Pin className="size-4" />;
    case 'mute-tab':
      return <Volume2 className="size-4" />;
    case 'move-to-new-window':
      return <Maximize2 className="size-4" />;
    case 'bookmark-page':
      return <Bookmark className="size-4" />;
    case 'paste-snippet':
      return <Clipboard className="size-4" />;
    case 'copy':
      return <Link2 className="size-4" />;
    default:
      return <Link2 className="size-4" />;
  }
};

/** Command palette — alias search and navigation (Phase 1) */
export function FlickShell({ onClose, isPopup, activeTabId }: FlickShellProps) {
  const { query, setQuery, results, aliasResults, devToolResults, snippetResults, loading } = useFlickSearch();

  useBlockPageInteraction(!isPopup);

  // When running in the side panel / popup, explicitly grab focus and focus
  // the search input. `autoFocus` alone isn't enough because the side panel
  // window may not have focus when it opens.
  useEffect(() => {
    if (!isPopup) return;
    window.focus();
    const focusInput = () => {
      const input = document.querySelector<HTMLInputElement>('input[aria-label="Command search"]');
      input?.focus();
    };
    focusInput();
    const raf = requestAnimationFrame(focusInput);
    return () => cancelAnimationFrame(raf);
  }, [isPopup]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    if (isPopup) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }

    let root: ShadowRoot | null = null;
    for (const child of document.body.children) {
      if (
        child instanceof HTMLElement &&
        child.shadowRoot?.getElementById('flick-root')
      ) {
        root = child.shadowRoot;
        break;
      }
    }
    if (!root) return;

    root.addEventListener('keydown', onKeyDown as EventListener, true);
    return () => root.removeEventListener('keydown', onKeyDown as EventListener, true);
  }, [onClose, isPopup]);

  const handleSendAction = useCallback(
    (item: CommandItem) => {
      const message: Record<string, unknown> = {
        type: 'EXECUTE_ACTION',
        action: item.action,
      };
      if (activeTabId != null) {
        message.tabId = activeTabId;
      }
      browser.runtime.sendMessage(message);
      onClose();
    },
    [onClose, activeTabId],
  );

  const handleGoogleSearch = useCallback(() => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const message: Record<string, unknown> = {
      type: 'EXECUTE_ACTION',
      action: { type: 'navigate', url: searchUrl },
    };
    if (activeTabId != null) {
      message.tabId = activeTabId;
    }
    browser.runtime.sendMessage(message);
    onClose();
  }, [query, activeTabId, onClose]);

  const handleSelect = useCallback(
    (value: string) => {
      if (value === `google-${query}`) {
        handleGoogleSearch();
        return;
      }
      const item = results.find((result) => result.id === value);
      if (item) handleSendAction(item);
    },
    [results, handleSendAction, handleGoogleSearch, query],
  );

  const isDefault = query === '';
  const visibleAliases = isDefault ? aliasResults.slice(0, 3) : aliasResults;
  const visibleSnippets = isDefault ? snippetResults.slice(0, 3) : snippetResults;
  const visibleDevTools = isDefault ? devToolResults.slice(0, 3) : devToolResults;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[2147483647] flex items-start justify-center',
        isPopup ? 'pt-6' : 'pt-[15vh] bg-black/40 backdrop-blur-sm',
      )}
      role="dialog"
      aria-label="Flick"
      aria-modal="true"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Command
        className={cn(
          'w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl',
          'border-[var(--flick-border)] bg-[var(--flick-bg)] text-[var(--flick-text)]',
        )}
        shouldFilter={false}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--flick-border)] px-4 py-3">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--flick-muted)]"
            placeholder="Type a shortcut…"
            aria-label="Command search"
          />
        </div>

        <Command.List className="max-h-72 overflow-y-auto p-2">
          {loading ? (
            <div className="px-3 py-6 text-sm text-[var(--flick-muted)]">Loading shortcuts…</div>
          ) : (
            <>
              {visibleAliases.length === 0 && visibleSnippets.length === 0 && visibleDevTools.length === 0 ? (
                query !== '' ? (
                  <Command.Item
                    value={`google-${query}`}
                    onSelect={handleSelect}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                      'text-[var(--flick-text)] aria-selected:bg-white/10',
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--flick-accent)]">
                      <ExternalLink className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        Search Google for &ldquo;{query}&rdquo;
                      </span>
                    </span>
                  </Command.Item>
                ) : (
                  <Command.Empty className="px-3 py-6 text-sm text-[var(--flick-muted)]">
                    No matching shortcuts.
                  </Command.Empty>
                )
              ) : null}

              {visibleAliases.length > 0 && (
                <Command.Group heading="Shortcuts">
                  {visibleAliases.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={handleSelect}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                        'text-[var(--flick-text)] aria-selected:bg-white/10',
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--flick-accent)]">
                        {actionIcon(item)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.title}</span>
                        {item.subtitle ? (
                          <span className="block truncate text-xs text-[var(--flick-muted)]">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {visibleSnippets.length > 0 && (
                <Command.Group heading="Snippets">
                  {visibleSnippets.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={handleSelect}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                        'text-[var(--flick-text)] aria-selected:bg-white/10',
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--flick-accent)]">
                        {actionIcon(item)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.title}</span>
                        {item.subtitle ? (
                          <span className="block truncate text-xs text-[var(--flick-muted)]">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {visibleDevTools.length > 0 && (
                <Command.Group heading="Developer Tools">
                  {visibleDevTools.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={handleSelect}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                        'text-[var(--flick-text)] aria-selected:bg-white/10',
                      )}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--flick-accent)]">
                        {actionIcon(item)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.title}</span>
                        {item.subtitle ? (
                          <span className="block truncate text-xs text-[var(--flick-muted)]">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}
        </Command.List>

        <div className="flex items-center justify-between border-t border-[var(--flick-border)] px-4 py-2 text-xs text-[var(--flick-muted)]">
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↵</kbd>
            <span>open</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑↓</kbd>
            <span>navigate</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">esc</kbd>
            <span>close</span>
          </div>

          <button
            onClick={openSettings}
            className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-white"
          >
            <Settings className="size-3" />
            Settings
          </button>
        </div>
      </Command>
    </div>
  );
}
