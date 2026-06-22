import { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  Camera,
  Copy,
  ExternalLink,
  FileText,
  Grid3x3,
  Link2,
  Maximize2,
  Moon,
  Pin,
  Plus,
  Ruler,
  Trash2,
  Volume2,
  Wrench,
  X,
} from 'lucide-react';
import type { TextSnippet, UrlAlias } from '@/types';
import { getAllAliases, saveAliases } from '@/lib/storage/aliases';
import { getAllSnippets, saveSnippets } from '@/lib/storage/snippets';
import { DEV_TOOLS } from '@/data/dev-tools';

import { cn } from '@/lib/cn';

type Tab = 'shortcuts' | 'snippets' | 'features';

type FormState = Pick<UrlAlias, 'trigger' | 'url' | 'description' | 'newTab'> & { keywords: string; variableSuffix: string };

const emptyForm: FormState = {
  trigger: '',
  url: '',
  variableSuffix: '',
  description: '',
  keywords: '',
  newTab: true,
};

const TABS: { id: Tab; label: string; icon: typeof Link2; hint: string }[] = [
  { id: 'shortcuts', label: 'Shortcuts', icon: Link2, hint: 'Manage your URL shortcuts and aliases.' },
  { id: 'snippets', label: 'Snippets', icon: FileText, hint: 'Manage reusable text snippets for your clipboard.' },
  { id: 'features', label: 'Features', icon: Wrench, hint: 'Built-in developer tools available from the palette.' },
];

function generateId(): string {
  return crypto.randomUUID();
}


function parseKeywords(value: string): string[] {
  return value
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

const FEATURE_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: 'Capture & Visual',
    ids: ['dev-screenshot', 'dev-dark-mode', 'dev-show-grid', 'dev-show-rulers'],
  },
  {
    label: 'Tab Management',
    ids: ['dev-duplicate-tab', 'dev-pin-tab', 'dev-mute-tab', 'dev-move-window'],
  },
  {
    label: 'Page Actions',
    ids: ['dev-bookmark', 'dev-copy-markdown', 'dev-copy-url'],
  },
  {
    label: 'Cache & Storage',
    ids: ['dev-clear-cache'],
  },
];

const devToolIcon = (type: string) => {
  switch (type) {
    case 'screenshot': return <Camera className="size-4" />;
    case 'toggle-dark-mode': return <Moon className="size-4" />;
    case 'clear-cache': return <Trash2 className="size-4" />;
    case 'show-grid': return <Grid3x3 className="size-4" />;
    case 'show-rulers': return <Ruler className="size-4" />;
    case 'duplicate-tab': return <Copy className="size-4" />;
    case 'pin-tab': return <Pin className="size-4" />;
    case 'mute-tab': return <Volume2 className="size-4" />;
    case 'move-to-new-window': return <Maximize2 className="size-4" />;
    case 'bookmark-page': return <Bookmark className="size-4" />;
    case 'copy': return <ExternalLink className="size-4" />;
    default: return <ExternalLink className="size-4" />;
  }
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-all duration-300',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--flick-accent)]',
        enabled
          ? 'bg-[var(--flick-accent)] shadow-[0_0_12px_oklch(0.65_0.2_250/0.45)]'
          : 'bg-white/10 hover:bg-white/15',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-300',
          enabled ? 'left-[18px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}

function Input({
  label,
  hint,
  placeholder,
  value,
  onChange,
  mono,
  autoFocus,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="group block">
      <span className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--flick-muted)]">
        {label}
        {hint && <span className="ml-1 font-normal opacity-50">{hint}</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none transition-all duration-200',
          'border-[var(--flick-border)] placeholder:text-[var(--flick-muted)]/40',
          'focus:border-[var(--flick-accent)]/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_oklch(0.65_0.2_250/0.12)]',
          mono && 'font-mono tracking-tight',
        )}
      />
    </label>
  );
}

function CountPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--flick-muted)] ring-1 ring-white/[0.05]">
      {children}
    </span>
  );
}

function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--flick-muted)]">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-[var(--flick-border)] to-transparent" />
      {count !== undefined && <CountPill>{count}</CountPill>}
    </div>
  );
}

function Modal({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel,
  submitDisabled,
  editing,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  submitLabel: string;
  submitDisabled: boolean;
  editing: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-modal w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--flick-border)] bg-[var(--flick-bg)] shadow-[0_24px_64px_-20px_rgba(0,0,0,0.7)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--flick-border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-b from-white/[0.09] to-white/[0.02] text-xs text-[var(--flick-muted)] ring-1 ring-white/[0.06]">
              {editing ? '✎' : '+'}
            </span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-[var(--flick-muted)] transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="space-y-4 px-5 py-5">{children}</div>
          <div className="flex items-center justify-end gap-3 border-t border-[var(--flick-border)] px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--flick-muted)] transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                submitDisabled
                  ? 'cursor-not-allowed bg-white/[0.04] text-[var(--flick-muted)]'
                  : 'bg-[var(--flick-accent)] text-white shadow-[0_4px_14px_oklch(0.65_0.2_250/0.3)] hover:brightness-110 hover:shadow-[0_6px_20px_oklch(0.65_0.2_250/0.45)]',
              )}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeaturesTab() {
  return (
    <div className="animate-in space-y-10">
      <p className="max-w-prose text-sm leading-relaxed text-[var(--flick-muted)]">
        Built-in commands available from the Flick palette. Type any keyword to find them — no setup required.
      </p>
      {FEATURE_GROUPS.map((group) => {
        const items = DEV_TOOLS.filter((t) => group.ids.includes(t.id));
        if (!items.length) return null;
        return (
          <section key={group.label}>
            <SectionHeading>{group.label}</SectionHeading>
            <div className="grid gap-2.5">
              {items.map((tool) => (
                <div
                  key={tool.id}
                  className="group flex items-start gap-4 rounded-xl border border-[var(--flick-border)] bg-[var(--flick-surface)]/50 p-4 transition-all duration-200 hover:border-[var(--flick-accent)]/20 hover:bg-[var(--flick-hover)]/60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-white/[0.09] to-white/[0.02] text-[var(--flick-accent)] ring-1 ring-white/[0.06] transition-all duration-200 group-hover:from-[var(--flick-accent)]/20 group-hover:to-[var(--flick-accent)]/5 group-hover:ring-[var(--flick-accent)]/25">
                    {devToolIcon(tool.action.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{tool.title}</div>
                    <div className="mt-0.5 text-sm leading-relaxed text-[var(--flick-muted)]">{tool.subtitle}</div>
                    {tool.keywords && tool.keywords.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {tool.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[var(--flick-muted)] ring-1 ring-white/[0.05]"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function OptionsApp() {
  const [tab, setTab] = useState<Tab>('shortcuts');
  const [aliases, setAliases] = useState<UrlAlias[]>([]);
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [snippetForm, setSnippetForm] = useState<Pick<TextSnippet, 'trigger' | 'text' | 'label'> & { keywords: string }>({
    trigger: '',
    text: '',
    label: '',
    keywords: '',
  });
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([getAllAliases(), getAllSnippets()]).then(([aliasData, snippetData]) => {
      setAliases(aliasData);
      setSnippets(snippetData);
      setLoading(false);
    });
  }, []);

  const persist = useCallback(async (next: UrlAlias[]) => {
    setAliases(next);
    await saveAliases(next);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trigger.trim() || !form.url.trim()) return;

    const suffix = form.variableSuffix.trim();
    const urlTemplate = suffix ? form.url.trim() + suffix : undefined;

    if (editingId) {
      persist(
        aliases.map((a) =>
          a.id === editingId
            ? {
                ...a,
                trigger: form.trigger,
                url: form.url,
                urlTemplate,
                description: form.description || undefined,
                keywords: parseKeywords(form.keywords),
                newTab: form.newTab,
              }
            : a,
        ),
      );
    } else {
      const newAlias: UrlAlias = {
        id: generateId(),
        trigger: form.trigger.trim(),
        url: form.url.trim(),
        urlTemplate,
        description: (form.description ?? '').trim() || undefined,
        keywords: parseKeywords(form.keywords),
        newTab: form.newTab,
        enabled: true,
      };
      persist([...aliases, newAlias]);
    }

    resetForm();
    setModalOpen(false);
  };

  const startEdit = (alias: UrlAlias) => {
    const baseUrl = alias.url;
    const suffix = alias.urlTemplate?.startsWith(baseUrl)
      ? alias.urlTemplate.slice(baseUrl.length)
      : (alias.urlTemplate ?? '');
    setForm({
      trigger: alias.trigger,
      url: baseUrl,
      variableSuffix: suffix,
      description: alias.description ?? '',
      keywords: alias.keywords?.join(', ') ?? '',
      newTab: alias.newTab ?? true,
    });
    setEditingId(alias.id);
    setModalOpen(true);
  };

  const openNewModal = () => {
    if (tab === 'snippets') resetSnippetForm();
    else resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (tab === 'snippets') resetSnippetForm();
    else resetForm();
    setModalOpen(false);
  };

  const remove = (id: string) => {
    persist(aliases.filter((a) => a.id !== id));
  };

  const toggleEnabled = (id: string) => {
    persist(
      aliases.map((a) => (a.id === id ? { ...a, enabled: !(a.enabled ?? true) } : a)),
    );
  };

  const persistSnippets = useCallback(async (next: TextSnippet[]) => {
    setSnippets(next);
    await saveSnippets(next);
  }, []);

  const resetSnippetForm = () => {
    setSnippetForm({ trigger: '', text: '', label: '', keywords: '' });
    setEditingSnippetId(null);
  };

  const handleSnippetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetForm.trigger.trim() || !snippetForm.text.trim()) return;

    if (editingSnippetId) {
      persistSnippets(
        snippets.map((s) =>
          s.id === editingSnippetId
            ? { ...s, ...snippetForm, keywords: parseKeywords(snippetForm.keywords) }
            : s,
        ),
      );
    } else {
      const newSnippet: TextSnippet = {
        id: generateId(),
        trigger: snippetForm.trigger.trim(),
        text: snippetForm.text.trim(),
        label: snippetForm.label?.trim() || undefined,
        keywords: parseKeywords(snippetForm.keywords),
        enabled: true,
      };
      persistSnippets([...snippets, newSnippet]);
    }

    resetSnippetForm();
    setModalOpen(false);
  };

  const startEditSnippet = (snippet: TextSnippet) => {
    setSnippetForm({
      trigger: snippet.trigger,
      text: snippet.text,
      label: snippet.label ?? '',
      keywords: snippet.keywords?.join(', ') ?? '',
    });
    setEditingSnippetId(snippet.id);
    setModalOpen(true);
  };

  const removeSnippet = (id: string) => {
    persistSnippets(snippets.filter((s) => s.id !== id));
  };

  const toggleSnippetEnabled = (id: string) => {
    persistSnippets(
      snippets.map((s) => (s.id === id ? { ...s, enabled: !(s.enabled ?? true) } : s)),
    );
  };

  const formIsValid = form.trigger.trim() && form.url.trim()
    && (!form.variableSuffix.trim() || form.variableSuffix.includes('{variable}'));

  const snippetFormIsValid = snippetForm.trigger.trim() && snippetForm.text.trim();

  const currentTab = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="relative min-h-screen">
      {/* ── Ambient background ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,oklch(0.65_0.2_250/0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_50%_at_85%_10%,oklch(0.65_0.2_250/0.06),transparent)]" />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:py-16">
        {/* ── Header ── */}
        <header className="mb-10">
          <div className="flex items-center gap-3.5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--flick-accent)]/25 to-[var(--flick-accent)]/5 text-base font-semibold text-[var(--flick-accent)] ring-1 ring-[var(--flick-accent)]/25 shadow-[0_10px_30px_-10px_oklch(0.65_0.2_250/0.6)]">
              ⌘
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Flick</h1>
              <p className="text-sm text-[var(--flick-muted)]">Settings</p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* ── Sidebar nav ── */}
          <aside className="sticky top-0 z-20 self-start lg:top-8">
            <div className="-mx-6 bg-[oklch(0.11_0.003_260)]/80 px-6 py-3 backdrop-blur-md sm:-mx-8 sm:px-8 lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
              <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--flick-border)] bg-[var(--flick-surface)]/60 p-1.5 backdrop-blur-sm lg:flex-col lg:overflow-visible">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={cn(
                        'group relative flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-white/[0.06] text-white'
                          : 'text-[var(--flick-muted)] hover:bg-white/[0.03] hover:text-white',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--flick-accent)] shadow-[0_0_8px_oklch(0.65_0.2_250/0.7)] lg:block" />
                      )}
                      <Icon
                        className={cn(
                          'size-4 shrink-0 transition-colors',
                          active ? 'text-[var(--flick-accent)]' : 'text-[var(--flick-muted)] group-hover:text-white',
                        )}
                      />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="min-w-0">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{currentTab.label}</h2>
                <p className="mt-1 text-sm text-[var(--flick-muted)]">{currentTab.hint}</p>
              </div>
              {(tab === 'shortcuts' || tab === 'snippets') && (
                <button
                  type="button"
                  onClick={openNewModal}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--flick-accent)] px-3.5 py-2 text-sm font-medium text-white shadow-[0_4px_14px_oklch(0.65_0.2_250/0.3)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_6px_20px_oklch(0.65_0.2_250/0.45)]"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">New {tab === 'shortcuts' ? 'shortcut' : 'snippet'}</span>
                  <span className="sm:hidden">New</span>
                </button>
              )}
            </div>

            {tab === 'shortcuts' ? (
              <div className="animate-in">
                {/* ── Alias list / Empty state ── */}
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="size-5 animate-spin rounded-full border-2 border-[var(--flick-border)] border-t-[var(--flick-accent)]" />
                  </div>
                ) : aliases.length === 0 ? (
                  <section>
                    <SectionHeading>Get started</SectionHeading>
                    <p className="mb-5 max-w-prose text-sm leading-relaxed text-[var(--flick-muted)]">
                      No shortcuts yet. Add your first one with the New button above.
                    </p>
                  </section>
                ) : (
                  <section>
                    <SectionHeading count={aliases.length}>Your shortcuts</SectionHeading>
                    <div className="space-y-1.5">
                      {aliases.map((alias) => (
                        <div
                          key={alias.id}
                          className={cn(
                            'group flex items-center gap-4 rounded-xl border border-[var(--flick-border)] bg-[var(--flick-surface)]/50 px-4 py-3.5 transition-all duration-200',
                            'hover:border-[var(--flick-accent)]/20 hover:bg-[var(--flick-hover)]/60',
                            alias.enabled === false && 'opacity-40',
                          )}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-xs font-semibold text-[var(--flick-accent)] ring-1 ring-white/[0.06]">
                            {alias.trigger.slice(0, 2)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-medium">{alias.trigger}</span>
                              {alias.description && (
                                <span className="truncate text-xs text-[var(--flick-muted)]">
                                  {alias.description}
                                </span>
                              )}
                            </div>
                            <code className="mt-0.5 block truncate font-mono text-xs tracking-tight text-[var(--flick-muted)]/60">
                              {alias.url}
                            </code>
                            {alias.urlTemplate && (
                              <code className="mt-0.5 block truncate font-mono text-xs tracking-tight text-[var(--flick-accent)]/60">
                                {alias.urlTemplate}
                              </code>
                            )}
                            {alias.keywords && alias.keywords.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {alias.keywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--flick-muted)]"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <Toggle
                              enabled={alias.enabled ?? true}
                              onChange={() => toggleEnabled(alias.id)}
                            />
                            <button
                              onClick={() => startEdit(alias)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--flick-muted)] transition-colors hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => remove(alias.id)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--flick-muted)] transition-colors hover:text-red-400"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <footer className="mt-12 border-t border-[var(--flick-border)] pt-5 text-xs leading-relaxed text-[var(--flick-muted)]">
                  Aliases are synced via{' '}
                  <code className="font-mono text-white/40">chrome.storage.sync</code>.
                  Changes appear instantly in the palette.
                </footer>
              </div>
            ) : tab === 'snippets' ? (
              <div className="animate-in">
                {/* ── Snippet list / Empty state ── */}
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="size-5 animate-spin rounded-full border-2 border-[var(--flick-border)] border-t-[var(--flick-accent)]" />
                  </div>
                ) : snippets.length === 0 ? (
                  <section>
                    <SectionHeading>Get started</SectionHeading>
                    <p className="mb-5 max-w-prose text-sm leading-relaxed text-[var(--flick-muted)]">
                      No snippets yet. Add your first one with the New button above.
                    </p>
                  </section>
                ) : (
                  <section>
                    <SectionHeading count={snippets.length}>Your snippets</SectionHeading>
                    <div className="space-y-1.5">
                      {snippets.map((snippet) => (
                        <div
                          key={snippet.id}
                          className={cn(
                            'group flex items-center gap-4 rounded-xl border border-[var(--flick-border)] bg-[var(--flick-surface)]/50 px-4 py-3.5 transition-all duration-200',
                            'hover:border-[var(--flick-accent)]/20 hover:bg-[var(--flick-hover)]/60',
                            snippet.enabled === false && 'opacity-40',
                          )}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-xs font-semibold text-[var(--flick-accent)] ring-1 ring-white/[0.06]">
                            {snippet.trigger.slice(0, 2)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-medium">{snippet.trigger}</span>
                              {snippet.label && (
                                <span className="truncate text-xs text-[var(--flick-muted)]">
                                  {snippet.label}
                                </span>
                              )}
                            </div>
                            <code className="mt-0.5 block truncate font-mono text-xs tracking-tight text-[var(--flick-muted)]/60">
                              {snippet.text}
                            </code>
                            {snippet.keywords && snippet.keywords.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {snippet.keywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--flick-muted)]"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <Toggle
                              enabled={snippet.enabled ?? true}
                              onChange={() => toggleSnippetEnabled(snippet.id)}
                            />
                            <button
                              onClick={() => startEditSnippet(snippet)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--flick-muted)] transition-colors hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeSnippet(snippet.id)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--flick-muted)] transition-colors hover:text-red-400"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <footer className="mt-12 border-t border-[var(--flick-border)] pt-5 text-xs leading-relaxed text-[var(--flick-muted)]">
                  Snippets are synced via{' '}
                  <code className="font-mono text-white/40">chrome.storage.sync</code>.
                  Type the trigger in the palette to copy the content to your clipboard.
                </footer>
              </div>
            ) : (
              <FeaturesTab />
            )}
          </main>
        </div>
      </div>

      {(tab === 'shortcuts' || tab === 'snippets') && (
        <Modal
          open={modalOpen}
          onClose={closeModal}
          onSubmit={tab === 'shortcuts' ? handleSubmit : handleSnippetSubmit}
          title={
            tab === 'shortcuts'
              ? editingId
                ? 'Edit shortcut'
                : 'New shortcut'
              : editingSnippetId
                ? 'Edit snippet'
                : 'New snippet'
          }
          submitLabel={
            tab === 'shortcuts'
              ? editingId
                ? 'Save changes'
                : 'Add shortcut'
              : editingSnippetId
                ? 'Save changes'
                : 'Add snippet'
          }
          submitDisabled={tab === 'shortcuts' ? !formIsValid : !snippetFormIsValid}
          editing={tab === 'shortcuts' ? !!editingId : !!editingSnippetId}
        >
          {tab === 'shortcuts' ? (
            <>
              <Input
                label="Trigger"
                placeholder="e.g. backend-pull"
                value={form.trigger}
                onChange={(v) => setForm({ ...form, trigger: v })}
                autoFocus
              />
              <Input
                label="URL"
                placeholder="https://www.youtube.com"
                value={form.url}
                onChange={(v) => setForm({ ...form, url: v })}
                mono
              />
              <label className="group block">
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--flick-muted)]">
                  Variable path
                  <span className="ml-1 font-normal opacity-50">(optional)</span>
                </span>
                <div
                  className={cn(
                    'flex items-center overflow-hidden rounded-lg border bg-white/[0.03] transition-all duration-200',
                    'border-[var(--flick-border)]',
                    'focus-within:border-[var(--flick-accent)]/50 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_3px_oklch(0.65_0.2_250/0.12)]',
                  )}
                >
                  <span className="shrink truncate border-r border-[var(--flick-border)] py-2.5 pl-3.5 pr-2.5 font-mono text-xs tracking-tight text-[var(--flick-muted)]/50 select-none">
                    {form.url || 'https://example.com'}
                  </span>
                  <input
                    value={form.variableSuffix}
                    onChange={(e) => setForm({ ...form, variableSuffix: e.target.value })}
                    placeholder="results?search_query={variable}"
                    className="min-w-0 flex-1 bg-transparent py-2.5 pl-3 pr-3.5 font-mono text-sm tracking-tight outline-none placeholder:text-[var(--flick-muted)]/30"
                  />
                </div>
              </label>
              <p className="text-[11px] leading-relaxed text-[var(--flick-muted)]">
                Use <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">{'{variable}'}</code> as a placeholder. Type <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px]">{form.trigger || 'trigger'}</code> followed by a value in the palette to search directly.
              </p>
              <Input
                label="Description"
                placeholder="What does this shortcut do?"
                value={form.description ?? ''}
                onChange={(v) => setForm({ ...form, description: v })}
              />
              <Input
                label="Keywords"
                hint="(comma-separated)"
                placeholder="github, pr, pulls"
                value={form.keywords}
                onChange={(v) => setForm({ ...form, keywords: v })}
              />
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm text-[var(--flick-muted)]">Open in new tab</span>
                <Toggle
                  enabled={form.newTab ?? true}
                  onChange={() => setForm({ ...form, newTab: !form.newTab })}
                />
              </div>
            </>
          ) : (
            <>
              <Input
                label="Trigger"
                placeholder="e.g. email"
                value={snippetForm.trigger}
                onChange={(v) => setSnippetForm({ ...snippetForm, trigger: v })}
                autoFocus
              />
              <Input
                label="Content"
                placeholder="Text to copy to clipboard"
                value={snippetForm.text}
                onChange={(v) => setSnippetForm({ ...snippetForm, text: v })}
                mono
              />
              <Input
                label="Label"
                hint="(optional)"
                placeholder="Brief description shown in palette"
                value={snippetForm.label ?? ''}
                onChange={(v) => setSnippetForm({ ...snippetForm, label: v })}
              />
              <Input
                label="Keywords"
                hint="(comma-separated)"
                placeholder="mail, contact"
                value={snippetForm.keywords}
                onChange={(v) => setSnippetForm({ ...snippetForm, keywords: v })}
              />
            </>
          )}
        </Modal>
      )}

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes modal-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modal {
          animation: modal-in 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes backdrop-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-backdrop {
          animation: backdrop-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
