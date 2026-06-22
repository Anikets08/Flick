import type { TextSnippet } from '@/types';

export const DEFAULT_SNIPPETS: TextSnippet[] = [
  {
    id: 'snippet-email',
    trigger: 'email',
    text: 'your@email.com',
    label: 'Personal email address',
    keywords: ['mail', 'contact'],
  },
  {
    id: 'snippet-address',
    trigger: 'address',
    text: '123 Main St, City, State 12345',
    label: 'Home address',
    keywords: ['home', 'location', 'shipping'],
  },
  {
    id: 'snippet-phone',
    trigger: 'phone',
    text: '+1 (555) 123-4567',
    label: 'Phone number',
    keywords: ['mobile', 'cell', 'tel'],
  },
  {
    id: 'snippet-name',
    trigger: 'name',
    text: 'John Doe',
    label: 'Full name',
    keywords: ['fullname', 'identity'],
  },
];


