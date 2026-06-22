import type { UrlAlias } from '@/types';

export const DEFAULT_ALIASES: UrlAlias[] = [
  {
    id: 'gh',
    trigger: 'gh',
    url: 'https://github.com',
    description: 'GitHub',
    keywords: ['github', 'code', 'repo'],
    newTab: true,
  },
  {
    id: 'yt',
    trigger: 'yt',
    url: 'https://www.youtube.com',
    urlTemplate: 'https://www.youtube.com/results?search_query={variable}',
    description: 'YouTube',
    keywords: ['video', 'watch', 'search'],
    newTab: true,
  },
  {
    id: 'mdn',
    trigger: 'mdn',
    url: 'https://developer.mozilla.org',
    description: 'MDN Web Docs',
    keywords: ['docs', 'javascript', 'css', 'html', 'web'],
    newTab: true,
  },
  {
    id: 'cal',
    trigger: 'cal',
    url: 'https://calendar.google.com',
    description: 'Google Calendar',
    keywords: ['calendar', 'google', 'schedule'],
    newTab: true,
  },
];


