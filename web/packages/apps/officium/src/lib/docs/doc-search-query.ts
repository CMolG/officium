import type { DocPage, DocSearchPart, DocSearchRange } from "../backlog/types";

/**
 * The documentation search's rules (JAVA-800, officium-api.md §8.7) for the in-memory repository, the
 * twin of the API's Postgres statement: Outline's operators (`"phrase"`, `OR`, `-word`), every term a
 * prefix, title and path matches first, and -- for a plain query only -- a page that merely contains the
 * text as typed still counts. The API is the source; this keeps the mock and the e2e honest.
 */

export interface SearchClause {
  words: string[];
  negated: boolean;
}

/** The query as groups joined by OR; each group is every clause at once. */
export type ParsedSearch = SearchClause[][];

const TOKEN = /(-?)"([^"]*)"|(\S+)/gu;
const SPLIT = /[^\p{L}\p{N}]+/u;
const wordsOf = (text: string) => text.toLowerCase().split(SPLIT).filter(Boolean);

export function parseSearch(text: string): ParsedSearch {
  const groups: ParsedSearch = [[]];
  for (const match of text.matchAll(TOKEN)) {
    const [, minus, phrase, bare] = match;
    if (bare === "OR") {
      groups.push([]);
      continue;
    }
    const negated = phrase !== undefined ? minus === "-" : bare.length > 1 && bare.startsWith("-");
    const words = wordsOf(phrase ?? (negated ? bare.slice(1) : bare));
    if (words.length > 0) groups[groups.length - 1].push({ words, negated });
  }
  return groups.filter((group) => group.length > 0);
}

/** Whether the words appear in order, each as a prefix of consecutive words of `haystack`. */
function hasPhrase(haystack: string[], words: string[]): boolean {
  for (let at = 0; at + words.length <= haystack.length; at++) {
    if (words.every((word, i) => haystack[at + i].startsWith(word))) return true;
  }
  return false;
}

/** A plain query uses none of the operators; only then does the substring tier apply. */
export function isPlainSearch(text: string): boolean {
  return !text.includes('"') && text.split(/\s+/).every((token) => token !== "OR" && !(token.length > 1 && token.startsWith("-")));
}

const matchesGroup = (group: SearchClause[], haystack: string[]) =>
  group.every((clause) => hasPhrase(haystack, clause.words) !== clause.negated);

export interface DocMatch {
  /** Matched by the full-text rules (otherwise only by containing the text as typed). */
  fullText: boolean;
  /** Matched in the title or the path, which rank first. */
  head: boolean;
}

export function matchDoc(text: string, doc: Pick<DocPage, "path" | "title" | "body">): DocMatch | null {
  const parsed = parseSearch(text);
  const head = wordsOf(`${doc.title} ${doc.path}`);
  const all = [...head, ...wordsOf(doc.body)];
  const fullText = parsed.some((group) => matchesGroup(group, all));
  const headHit = parsed.some((group) => group.some((clause) => !clause.negated && hasPhrase(head, clause.words)) && matchesGroup(group, all));
  if (fullText) return { fullText, head: headHit };
  if (!isPlainSearch(text)) return null;
  const needle = text.trim().toLowerCase();
  const inHead = `${doc.path} ${doc.title}`.toLowerCase().includes(needle);
  return inHead || doc.body.toLowerCase().includes(needle) ? { fullText: false, head: inHead } : null;
}

/** The excerpt as parts: a window around the first hit, with the query's terms marked. Never HTML. */
export function snippetParts(text: string, body: string): DocSearchPart[] {
  const clean = body.replace(/^---\n[\s\S]*?\n---\n/, "");
  const terms = parseSearch(text).flatMap((group) => group.filter((clause) => !clause.negated).flatMap((clause) => clause.words));
  const needles = terms.length > 0 ? terms : [text.trim().toLowerCase()];
  const escaped = needles.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const first = new RegExp(escaped.join("|"), "iu").exec(clean);
  const from = Math.max((first?.index ?? 0) - 60, 0);
  // A capture group makes split() alternate text and match: the odd entries are the hits.
  return clean
    .slice(from, from + 160)
    .split(new RegExp(`((?:${escaped.join("|")})\\p{L}*)`, "giu"))
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== "");
}

export const UPDATED_RANGES: readonly DocSearchRange[] = ["any", "day", "week", "month", "year"];

const DAYS: Record<Exclude<DocSearchRange, "any">, number> = { day: 1, week: 7, month: 30, year: 365 };

/** The `updatedAfter` instant for a range, or undefined for "any time". */
export function updatedAfterOf(range: DocSearchRange | undefined, now: number): string | undefined {
  return !range || range === "any" ? undefined : new Date(now - DAYS[range] * 86_400_000).toISOString();
}
