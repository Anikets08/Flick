export interface UrlAlias {
  id: string;
  /** Short trigger, e.g. "backend-pull" */
  trigger: string;
  /** Destination URL or template with {{param}} placeholders */
  url: string;
  /** Optional description shown in the palette */
  description?: string;
  /** Extra keywords for fuzzy matching */
  keywords?: string[];
  /** Open in new tab (default: current tab) */
  newTab?: boolean;
  /** Whether this alias is enabled */
  enabled?: boolean;
}

export interface AliasTemplate extends UrlAlias {
  /** Named capture groups for template params, e.g. "pr {{number}}" */
  urlTemplate?: string;
}
