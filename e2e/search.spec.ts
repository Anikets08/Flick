// Relevance checks for the palette's ranking — pure functions, no browser.
import { expect, test } from '@playwright/test';
import { DEFAULT_ALIASES } from '@/data/default-aliases';
import { searchAliases } from '@/lib/search/alias-search';
import { searchDevTools } from '@/lib/search/dev-tool-search';
import { searchSnippets } from '@/lib/search/snippet-search';
import { searchTabs, type TabSummary } from '@/lib/search/tab-search';

const topTool = (query: string) => searchDevTools(query, { fuzzy: true })[0]?.title;
const toolTitles = (query: string) => searchDevTools(query).map((t) => t.title);

test.describe('tools', () => {
  for (const query of ['dark', 'light', 'dark/light', 'theme', 'night', 'dark mode']) {
    test(`"${query}" → Toggle Dark Mode`, () => {
      expect(topTool(query)).toBe('Toggle Dark Mode');
    });
  }

  const expectations: [string, string][] = [
    ['screenshot', 'Screenshot — Current Tab'],
    ['scr', 'Screenshot — Current Tab'],
    ['screnshot', 'Screenshot — Current Tab'], // typo
    ['crop', 'Screenshot — Select Element'],
    ['hard reload', 'Clear Cache'],
    ['hex', 'Color Picker'],
    ['eyedropper', 'Color Picker'],
    ['volume', 'Toggle Mute Tab'],
    ['popout', 'Move to New Window'],
    ['measure', 'Toggle Pixel Rulers'],
    ['copy title', 'Copy Page Title'],
    ['star', 'Bookmark Page'],
  ];
  for (const [query, title] of expectations) {
    test(`"${query}" → ${title}`, () => {
      expect(topTool(query)).toBe(title);
    });
  }

  test('a name match beats a synonym match', () => {
    expect(topTool('copy')).toMatch(/^Copy /);
  });

  test('matches word starts, not the middle of words', () => {
    // "sig" is inside "design" (grid's description) — that's not a match.
    expect(toolTitles('sig')).not.toContain('Toggle Column Grid');
  });

  test('every word of the query has to match', () => {
    const titles = toolTitles('copy url');
    expect(titles[0]).toBe('Copy URL');
    expect(titles).not.toContain('Copy Page Title');
    expect(titles).not.toContain('Duplicate Tab'); // has "copy" but not "url"
  });
});

test.describe('shortcuts and snippets', () => {
  test('no fuzzy matches unless asked — "dark" must not hit "calendar"', () => {
    expect(searchAliases(DEFAULT_ALIASES, 'dark')).toEqual([]);
  });

  test('exact trigger wins outright', () => {
    expect(searchAliases(DEFAULT_ALIASES, 'gh').map((a) => a.title)).toEqual(['gh']);
  });

  test('description and URL words find a shortcut', () => {
    expect(searchAliases(DEFAULT_ALIASES, 'calendar')[0]?.title).toBe('cal');
    expect(searchAliases(DEFAULT_ALIASES, 'mozilla')[0]?.title).toBe('mdn');
  });

  test('prefix of a trigger ranks above a fuzzy match', () => {
    const aliases = [
      { id: 'a', trigger: 'jira-board', url: 'https://jira.test/' },
      { id: 'b', trigger: 'jenkins', url: 'https://ci.test/' },
    ];
    expect(searchAliases(aliases, 'jira')[0]?.title).toBe('jira-board');
  });

  test('snippet label finds the snippet', () => {
    const snippets = [{ id: 's', trigger: 'sig', text: 'Cheers', label: 'Email signature' }];
    expect(searchSnippets(snippets, 'signature')[0]?.title).toBe('sig');
  });
});

test.describe('open tabs', () => {
  const tabs: TabSummary[] = [
    { id: 1, windowId: 1, title: 'Pull requests · flick', url: 'https://github.com/aniket/flick/pulls' },
    { id: 2, windowId: 1, title: 'Inbox (3) - Mail', url: 'https://mail.google.com/mail/u/0/' },
    { id: 3, windowId: 2, title: 'Sprint Board - Jira', url: 'https://acme.atlassian.net/jira/board' },
  ];

  test('matches title words, URL fragments, and partial hostnames', () => {
    expect(searchTabs(tabs, 'inbox')[0]?.title).toBe('Inbox (3) - Mail');
    expect(searchTabs(tabs, 'github')[0]?.title).toBe('Pull requests · flick');
    expect(searchTabs(tabs, 'atlassian')[0]?.title).toBe('Sprint Board - Jira');
    expect(searchTabs(tabs, 'hub')[0]?.title).toBe('Pull requests · flick');
  });

  test('title matches outrank URL-only matches', () => {
    const titled: TabSummary[] = [
      { id: 1, windowId: 1, title: 'Docs home', url: 'https://board.test/' },
      { id: 2, windowId: 1, title: 'Board', url: 'https://x.test/' },
    ];
    expect(searchTabs(titled, 'board')[0]?.title).toBe('Board');
  });
});
