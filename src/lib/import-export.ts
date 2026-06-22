import type { UrlAlias, TextSnippet } from '@/types';

export interface ExportData {
  version: number;
  exportedAt: string;
  aliases: UrlAlias[];
  snippets: TextSnippet[];
}

export interface ImportResult {
  aliasesAdded: number;
  snippetsAdded: number;
  aliasesSkipped: number;
  snippetsSkipped: number;
}

export function createExportData(aliases: UrlAlias[], snippets: TextSnippet[]): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    aliases,
    snippets,
  };
}

export function downloadExport(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flick-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportData(json: string): ExportData {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') throw new Error('Invalid file format');
  if (!Array.isArray(data.aliases)) throw new Error('Missing or invalid "aliases" array');
  if (!Array.isArray(data.snippets)) throw new Error('Missing or invalid "snippets" array');
  return {
    version: typeof data.version === 'number' ? data.version : 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    aliases: data.aliases,
    snippets: data.snippets,
  };
}

function isValidAlias(item: unknown): item is UrlAlias {
  if (!item || typeof item !== 'object') return false;
  const a = item as Record<string, unknown>;
  return typeof a.id === 'string' && typeof a.trigger === 'string' && typeof a.url === 'string';
}

function isValidSnippet(item: unknown): item is TextSnippet {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return typeof s.id === 'string' && typeof s.trigger === 'string' && typeof s.text === 'string';
}

export function mergeImport(
  existingAliases: UrlAlias[],
  importedAliases: UrlAlias[],
  existingSnippets: TextSnippet[],
  importedSnippets: TextSnippet[],
): { mergedAliases: UrlAlias[]; mergedSnippets: TextSnippet[]; result: ImportResult } {
  const validAliases = importedAliases.filter(isValidAlias);
  const validSnippets = importedSnippets.filter(isValidSnippet);

  const existingAliasIds = new Set(existingAliases.map((a) => a.id));
  const newAliases = validAliases.filter((a) => !existingAliasIds.has(a.id));

  const existingSnippetIds = new Set(existingSnippets.map((s) => s.id));
  const newSnippets = validSnippets.filter((s) => !existingSnippetIds.has(s.id));

  return {
    mergedAliases: [...existingAliases, ...newAliases],
    mergedSnippets: [...existingSnippets, ...newSnippets],
    result: {
      aliasesAdded: newAliases.length,
      snippetsAdded: newSnippets.length,
      aliasesSkipped: validAliases.length - newAliases.length,
      snippetsSkipped: validSnippets.length - newSnippets.length,
    },
  };
}
