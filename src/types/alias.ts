export interface UrlAlias {
  id: string;
  /** Short trigger, e.g. "backend-pull" */
  trigger: string;
  /** Destination URL (bare/fallback) */
  url: string;
  /** Optional template URL with {variable} placeholder, e.g. "https://youtube.com/results?search_query={variable}" */
  urlTemplate?: string;
  /** Optional description shown in the palette */
  description?: string;
  /** Extra keywords for fuzzy matching */
  keywords?: string[];
  /** Open in new tab (default: current tab) */
  newTab?: boolean;
  /** Whether this alias is enabled */
  enabled?: boolean;
}
