export interface TextSnippet {
  id: string;
  trigger: string;
  text: string;
  label?: string;
  keywords?: string[];
  enabled?: boolean;
}
