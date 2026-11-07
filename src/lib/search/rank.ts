/**
 * Shared relevance ranking for palette results.
 *
 * Each query token is matched against an item's fields as a whole word or a
 * word prefix ("dark" → "Toggle Dark Mode", "scr" → "Screenshot"). Matching
 * mid-word is opt-in per field (URLs, tab titles) so short queries like "sig"
 * don't hit unrelated words like "design". Every token must match somewhere.
 * Typo tolerance ("screnshot") is an opt-in fallback based on edit distance.
 * The palette enables it only when no group matched directly — run per group,
 * it lets junk like "dark" → "calendar" outrank a real match in another group.
 */

export interface SearchField {
  value: string | string[] | undefined;
  weight: number;
  /** Also match the token anywhere inside the text, not just at word starts. */
  substring?: boolean;
}

export interface SearchOptions {
  /** Fall back to typo-tolerant matching when nothing matches directly. */
  fuzzy?: boolean;
}

export interface Ranked<T> {
  item: T;
  score: number;
}

const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u;
const FUZZY_SCORE_SCALE = 0.3;
const FUZZY_MIN_TOKEN_LENGTH = 4;

/** Splits on whitespace, `/` and `,` so "dark/light" searches for both words. */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[\s/,]+/).filter(Boolean);
}

function tokenScore(token: string, text: string, substring: boolean): number {
  if (text === token) return 1;

  let best = 0;
  for (const word of text.split(WORD_SEPARATOR)) {
    if (!word) continue;
    if (word === token) return 0.9;
    if (word.startsWith(token)) best = Math.max(best, 0.6 + 0.2 * (token.length / word.length));
  }
  if (best) return best;

  if (substring && token.length >= 2 && text.includes(token)) return 0.4;
  return 0;
}

/** Average of each token's best field score, or 0 if any token matches nothing. */
export function scoreFields(tokens: string[], fields: SearchField[]): number {
  if (!tokens.length) return 0;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of fields) {
      const values = Array.isArray(field.value) ? field.value : field.value ? [field.value] : [];
      for (const value of values) {
        best = Math.max(best, tokenScore(token, value.toLowerCase(), !!field.substring) * field.weight);
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  return total / tokens.length;
}

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = new Array(rows * cols);
  for (let i = 0; i < rows; i++) d[i * cols] = i;
  for (let j = 0; j < cols; j++) d[j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(d[(i - 1) * cols + j] + 1, d[i * cols + j - 1] + 1, d[(i - 1) * cols + j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, d[(i - 2) * cols + j - 2] + 1);
      }
      d[i * cols + j] = value;
    }
  }
  return d[rows * cols - 1];
}

/**
 * 0..1 similarity of a (possibly partially typed) token to the closest word,
 * or 0 if it's too far off. Compares against the whole word and against the
 * word cut to the token's length, so "screnshot" and "scrensh" both match.
 */
function fuzzyTokenScore(token: string, words: string[]): number {
  if (token.length < FUZZY_MIN_TOKEN_LENGTH) return 0;
  const allowed = token.length >= 8 ? 2 : 1;

  let best = 0;
  for (const word of words) {
    if (Math.abs(word.length - token.length) > allowed && word.length < token.length) continue;
    const distance = Math.min(
      editDistance(token, word),
      editDistance(token, word.slice(0, token.length)),
    );
    if (distance <= allowed) best = Math.max(best, 1 - distance / token.length);
  }
  return best;
}

function fuzzyScore(tokens: string[], fields: SearchField[]): number {
  const words = fields
    .flatMap((field) => (Array.isArray(field.value) ? field.value : field.value ? [field.value] : []))
    .flatMap((value) => value.toLowerCase().split(WORD_SEPARATOR))
    .filter(Boolean);

  let total = 0;
  for (const token of tokens) {
    const score = fuzzyTokenScore(token, words);
    if (score === 0) return 0;
    total += score;
  }
  return (total / tokens.length) * FUZZY_SCORE_SCALE;
}

export function rankItems<T>(
  items: T[],
  query: string,
  fields: (item: T) => SearchField[],
  { fuzzy = false }: SearchOptions = {},
): Ranked<T>[] {
  const tokens = tokenize(query);
  if (!tokens.length) return items.map((item) => ({ item, score: 0 }));

  let ranked: Ranked<T>[] = [];
  for (const item of items) {
    const score = scoreFields(tokens, fields(item));
    if (score > 0) ranked.push({ item, score });
  }

  if (fuzzy && !ranked.length) {
    ranked = [];
    for (const item of items) {
      const score = fuzzyScore(tokens, fields(item));
      if (score > 0) ranked.push({ item, score });
    }
  }

  // Array.prototype.sort is stable, so ties keep the caller's order.
  return ranked.sort((a, b) => b.score - a.score);
}
