/** @jsxImportSource preact */
// Plain Preact (no React-compat layer) — this file ships in the on-page
// palette bundle, so every dependency here counts.
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  AppWindow,
  Bookmark,
  Camera,
  Clipboard,
  Copy,
  Crosshair,
  ExternalLink,
  Grid3x3,
  History,
  Link2,
  Maximize2,
  Moon,
  Pin,
  Pipette,
  Ruler,
  Search,
  Keyboard,
  Settings,
  Trash2,
  Volume2,
} from 'lucide-preact';
import { useBlockPageInteraction } from '@/hooks/use-block-page-interaction';
import { useFlickSearch } from '@/hooks/use-flick-search';
import { cn } from '@/lib/cn';
import { recordRecent } from '@/lib/storage/recents';
import type { CommandItem } from '@/types';

interface FlickShellProps {
  /** The palette stays mounted between uses; `open` shows or hides it. */
  open: boolean;
  onClose: () => void;
  isPopup?: boolean;
  activeTabId?: number;
}

function openSettings(): void {
  void browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
}

/**
 * '' when Chrome left the "open Flick" shortcut unassigned (it silently skips
 * keys another extension already uses), so the footer can offer to set one.
 * Content scripts can't read commands, so the background answers.
 */
function useOpenShortcut(open: boolean): string | null {
  const [shortcut, setShortcut] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    browser.runtime
      .sendMessage({ type: 'GET_SHORTCUT' })
      .then((value: string | undefined) => setShortcut(value ?? null))
      .catch(() => {});
  }, [open]);
  return shortcut;
}

const actionIcon = (item: CommandItem) => {
  if (item.category === 'bookmark') return <Bookmark className="size-4" />;
  if (item.category === 'history') return <History className="size-4" />;

  switch (item.action.type) {
    case 'switch-tab':
      return <AppWindow className="size-4" />;
    case 'color-picker':
      return <Pipette className="size-4" />;
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

interface ResultGroup {
  heading: string;
  /** Prefix for option values so the same item can appear in two groups. */
  prefix: string;
  items: CommandItem[];
}

const GOOGLE_VALUE = 'google-search';
const DEFAULT_GROUP_SIZE = 3;
const DEFAULT_RECENTS_SIZE = 5;
const LISTBOX_ID = 'flick-results';
const optionId = (index: number) => `flick-option-${index}`;

/** Command palette — shortcuts, tools, browser search, and snippets */
export function FlickShell({ open, onClose, isPopup, activeTabId }: FlickShellProps) {
  const {
    query,
    setQuery,
    recentResults,
    aliasResults,
    tabResults,
    bookmarkResults,
    historyResults,
    devToolResults,
    snippetResults,
    loading,
  } = useFlickSearch(open, activeTabId);

  const shortcut = useOpenShortcut(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useBlockPageInteraction(open && !isPopup);

  // Focus the input every time the palette opens. In the side panel, the
  // panel window itself may not have focus yet, so grab that too.
  useEffect(() => {
    if (!open) return;
    if (isPopup) window.focus();
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    const raf = requestAnimationFrame(focusInput);
    return () => cancelAnimationFrame(raf);
  }, [open, isPopup]);

  const runItem = useCallback(
    (item: CommandItem) => {
      const message: Record<string, unknown> = {
        type: 'EXECUTE_ACTION',
        action: item.action,
      };
      if (activeTabId != null) {
        message.tabId = activeTabId;
      }
      browser.runtime.sendMessage(message);
      void recordRecent(item).catch(() => {});
      onClose();
    },
    [onClose, activeTabId],
  );

  const runGoogleSearch = useCallback(() => {
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

  const isDefault = query.trim() === '';

  const groups: ResultGroup[] = useMemo(() => {
    const all: ResultGroup[] = isDefault
      ? [
          { heading: 'Recent', prefix: 'recent', items: recentResults.slice(0, DEFAULT_RECENTS_SIZE) },
          { heading: 'Shortcuts', prefix: 'alias', items: aliasResults.slice(0, DEFAULT_GROUP_SIZE) },
          { heading: 'Tools', prefix: 'devtool', items: devToolResults.slice(0, DEFAULT_GROUP_SIZE) },
          { heading: 'Snippets', prefix: 'snippet', items: snippetResults.slice(0, DEFAULT_GROUP_SIZE) },
        ]
      : [
          { heading: 'Shortcuts', prefix: 'alias', items: aliasResults },
          { heading: 'Tools', prefix: 'devtool', items: devToolResults },
          { heading: 'Open Tabs', prefix: 'tab', items: tabResults },
          { heading: 'Snippets', prefix: 'snippet', items: snippetResults },
          { heading: 'Bookmarks', prefix: 'bookmark', items: bookmarkResults },
          { heading: 'History', prefix: 'history', items: historyResults },
        ];
    return all.filter((group) => group.items.length > 0);
  }, [
    isDefault,
    recentResults,
    aliasResults,
    tabResults,
    snippetResults,
    devToolResults,
    bookmarkResults,
    historyResults,
  ]);

  // Every selectable row, in display order — drives keyboard navigation.
  const options = useMemo(() => {
    const list: { value: string; item?: CommandItem }[] = [];
    for (const group of groups) {
      for (const item of group.items) list.push({ value: `${group.prefix}:${item.id}`, item });
    }
    // Always offered as the last resort so it's one ↑ away.
    if (!isDefault) list.push({ value: GOOGLE_VALUE });
    return list;
  }, [groups, isDefault]);

  // Tab/bookmark/history results arrive asynchronously. When the top result
  // changes, move the selection to it — otherwise a stale "Search Google" row
  // stays selected and Enter skips the better match that just appeared.
  // Derived synchronously rather than reset in an effect: Preact runs effects
  // a frame late, so a fast "type + ↓" would otherwise get snapped back.
  const firstValue = options[0]?.value ?? '';
  const [selection, setSelection] = useState({ value: '', anchor: '' });
  const selectedValue = selection.anchor === firstValue ? selection.value : firstValue;
  const setSelectedValue = (value: string) => setSelection({ value, anchor: firstValue });

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );

  useEffect(() => {
    listRef.current
      ?.querySelector(`#${optionId(selectedIndex)}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const runOption = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      if (option.item) runItem(option.item);
      else runGoogleSearch();
    },
    [options, runItem, runGoogleSearch],
  );

  const onKeyDown = (event: KeyboardEvent) => {
    const move = (to: number) => {
      event.preventDefault();
      const clamped = Math.min(Math.max(to, 0), options.length - 1);
      if (options[clamped]) setSelectedValue(options[clamped].value);
    };
    // Ctrl+N/P and Ctrl+J/K mirror the Emacs/Vim bindings cmdk used to provide.
    const ctrl = event.ctrlKey && !event.metaKey && !event.altKey;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown' || (ctrl && (event.key === 'n' || event.key === 'j'))) {
      move(selectedIndex + 1);
    } else if (event.key === 'ArrowUp' || (ctrl && (event.key === 'p' || event.key === 'k'))) {
      move(selectedIndex - 1);
    } else if (event.key === 'Home' && event.metaKey) {
      move(0);
    } else if (event.key === 'End' && event.metaKey) {
      move(options.length - 1);
    } else if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      runOption(selectedIndex);
    } else {
      return;
    }
    event.stopPropagation();
  };

  if (!open) return null;

  let optionIndex = 0;

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
      onKeyDown={onKeyDown}
    >
      <div
        className={cn(
          'w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl',
          'border-[var(--flick-border)] bg-[var(--flick-bg)] text-[var(--flick-text)]',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--flick-border)] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
            className="w-full bg-transparent text-lg outline-none placeholder:text-[var(--flick-muted)]"
            placeholder="Type a shortcut…"
            aria-label="Command search"
            role="combobox"
            aria-expanded="true"
            aria-controls={LISTBOX_ID}
            aria-autocomplete="list"
            aria-activedescendant={options.length ? optionId(selectedIndex) : undefined}
            autoComplete="off"
            spellcheck={false}
          />
        </div>

        <div ref={listRef} id={LISTBOX_ID} role="listbox" aria-label="Results" className="max-h-72 overflow-y-auto p-2">
          {loading ? (
            <div className="px-3 py-6 text-sm text-[var(--flick-muted)]">Loading shortcuts…</div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.prefix} role="group" aria-labelledby={`flick-group-${group.prefix}`}>
                  <GroupHeading id={`flick-group-${group.prefix}`}>{group.heading}</GroupHeading>
                  {group.items.map((item) => {
                    const index = optionIndex++;
                    return (
                      <ResultRow
                        key={item.id}
                        index={index}
                        selected={index === selectedIndex}
                        onHover={() => setSelectedValue(options[index].value)}
                        onRun={() => runOption(index)}
                        icon={actionIcon(item)}
                        title={item.title}
                        subtitle={item.subtitle}
                      />
                    );
                  })}
                </div>
              ))}

              {!isDefault ? (
                <div role="group" aria-labelledby="flick-group-web">
                  <GroupHeading id="flick-group-web">Web</GroupHeading>
                  <ResultRow
                    index={optionIndex}
                    selected={optionIndex === selectedIndex}
                    onHover={() => setSelectedValue(GOOGLE_VALUE)}
                    onRun={runGoogleSearch}
                    icon={<Search className="size-4" />}
                    title={`Search Google for “${query.trim()}”`}
                  />
                </div>
              ) : groups.length === 0 ? (
                <div className="px-3 py-6 text-sm text-[var(--flick-muted)]">No matching shortcuts.</div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--flick-border)] px-4 py-2 text-xs text-[var(--flick-muted)]">
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↵</kbd>
            <span>open</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑↓</kbd>
            <span>navigate</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">esc</kbd>
            <span>close</span>
          </div>

          <div className="flex items-center gap-1">
            {shortcut === '' ? (
              <button
                type="button"
                onClick={() => {
                  void browser.runtime.sendMessage({ type: 'OPEN_SHORTCUTS' });
                  onClose();
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-amber-300 transition-colors hover:text-amber-200"
              >
                <Keyboard className="size-3" />
                Set shortcut
              </button>
            ) : null}
            <button
              type="button"
              onClick={openSettings}
              className="flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-white"
            >
              <Settings className="size-3" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupHeading({ id, children }: { id: string; children: ComponentChildren }) {
  return (
    <div
      id={id}
      data-group-heading=""
      className="px-3 pt-2 pb-1 text-[0.6875rem] font-semibold uppercase tracking-[0.05em] text-[var(--flick-muted)]"
    >
      {children}
    </div>
  );
}

interface ResultRowProps {
  index: number;
  selected: boolean;
  onHover: () => void;
  onRun: () => void;
  icon: ComponentChildren;
  title: string;
  subtitle?: string;
}

function ResultRow({ index, selected, onHover, onRun, icon, title, subtitle }: ResultRowProps) {
  return (
    <div
      id={optionId(index)}
      role="option"
      aria-selected={selected}
      onMouseMove={selected ? undefined : onHover}
      onClick={onRun}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--flick-text)]',
        selected && 'bg-white/10',
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-[var(--flick-accent)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--flick-muted)]">{subtitle}</span>
        ) : null}
      </span>
    </div>
  );
}
