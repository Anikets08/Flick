export type CommandCategory =
  | 'alias'
  | 'tab'
  | 'bookmark'
  | 'history'
  | 'utility'
  | 'devtool'
  | 'recent'
  | 'snippet';

export type CommandAction =
  | { type: 'navigate'; url: string; newTab?: boolean }
  | { type: 'switch-tab'; tabId: number }
  | { type: 'close-tab'; tabId: number }
  | { type: 'screenshot'; mode: 'current-tab' | 'select-element' }
  | { type: 'copy'; value: 'url' | 'title' | 'markdown-link' }
  | { type: 'custom'; handlerId: string; args?: Record<string, string> }
  | { type: 'toggle-dark-mode' }
  | { type: 'clear-cache' }
  | { type: 'show-grid' }
  | { type: 'show-rulers' }
  | { type: 'duplicate-tab' }
  | { type: 'pin-tab' }
  | { type: 'mute-tab' }
  | { type: 'move-to-new-window' }
  | { type: 'bookmark-page' }
  | { type: 'paste-snippet'; text: string; label: string };

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  category: CommandCategory;
  icon?: string;
  action: CommandAction;
  score?: number;
}
