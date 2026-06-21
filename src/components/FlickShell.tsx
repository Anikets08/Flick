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
import { useCallback, useEffect, useMemo } from 'react';
import { useBlockPageInteraction } from '@/hooks/use-block-page-interaction';
import { useFlickSearch } from '@/hooks/use-flick-search';
import { SUGGESTIONS } from '@/data/default-aliases';
import { SNIPPET_SUGGESTIONS } from '@/data/default-snippets';
import { getAllAliases, saveAliases } from '@/lib/storage/aliases';
import { getAllSnippets, saveSnippets } from '@/lib/storage/snippets';
import { cn } from '@/lib/cn';
import type { CommandItem, TextSnippet, UrlAlias } from '@/types';

interface FlickShellProps {
  onClose: () => void;
  isPopup?: boolean;
  activeTabId?: number;
}

function openSettings(): void {
  void browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
}

async function addSuggestion(
  suggestion: UrlAlias,
  existingTriggers: Set<string>,
  onDone: () => void,
): Promise<void> {
  if (existingTriggers.has(suggestion.trigger)) {
    onDone();
    return;
  }

  const current = await getAllAliases();
  await saveAliases([
    ...current,
    { ...suggestion, id: crypto.randomUUID(), enabled: true },
  ]);
  onDone();
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
  const { query, setQuery, results, aliasResults, devToolResults, snippetResults, aliases, snippets, loading } = useFlickSearch();

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

  const handleSelect = useCallback(
    (value: string) => {
      const item = results.find((result) => result.id === value);
      if (item) handleSendAction(item);
    },
    [results, handleSendAction],
  );

  const existingTriggers = useMemo(
    () => new Set(aliases.map((a) => a.trigger)),
    [aliases],
  );

  const missing = useMemo(
    () => SUGGESTIONS.filter((s) => !existingTriggers.has(s.trigger)),
    [existingTriggers],
  );

  const existingSnippetTriggers = useMemo(
    () => new Set(snippets.map((s) => s.trigger)),
    [snippets],
  );

  const missingSnippets = useMemo(
    () => SNIPPET_SUGGESTIONS.filter((s) => !existingSnippetTriggers.has(s.trigger)),
    [existingSnippetTriggers],
  );

  const addSnippetSuggestion = async (suggestion: TextSnippet) => {
    if (existingSnippetTriggers.has(suggestion.trigger)) return;
    const current = await getAllSnippets();
    await saveSnippets([
      ...current,
      { ...suggestion, id: crypto.randomUUID(), enabled: true },
    ]);
    existingSnippetTriggers.add(suggestion.trigger);
  };

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
              <Command.Empty className="px-3 py-6 text-sm text-[var(--flick-muted)]">
                No matching shortcuts.
              </Command.Empty>

              {aliasResults.length > 0 && (
                <Command.Group heading="Shortcuts">
                  {aliasResults.map((item) => (
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

              {snippetResults.length > 0 && (
                <Command.Group heading="Snippets">
                  {snippetResults.map((item) => (
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

              {devToolResults.length > 0 && (
                <Command.Group heading="Developer Tools">
                  {devToolResults.map((item) => (
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

        {/* ── Suggestion chips ── */}
        {query === '' && (missing.length > 0 || missingSnippets.length > 0) && (
          <div className="border-t border-[var(--flick-border)] px-4 py-2.5">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--flick-muted)]">
              Quick add
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((s) => (
                <button
                  key={s.trigger}
                  onClick={() =>
                    void addSuggestion(s, existingTriggers, () => {
                      existingTriggers.add(s.trigger);
                    })
                  }
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs transition-colors hover:border-[var(--flick-accent)] hover:bg-white/10"
                  title={s.description}
                >
                  <span className="font-medium">{s.trigger}</span>
                  <span className="ml-1 text-[var(--flick-muted)]">{s.description}</span>
                </button>
              ))}
              {missingSnippets.map((s) => (
                <button
                  key={s.trigger}
                  onClick={() => void addSnippetSuggestion(s)}
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs transition-colors hover:border-[var(--flick-accent)] hover:bg-white/10"
                  title={s.label}
                >
                  <span className="font-medium">{s.trigger}</span>
                  <span className="ml-1 text-[var(--flick-muted)]">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
