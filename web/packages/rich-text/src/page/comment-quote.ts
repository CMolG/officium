/**
 * Where a comment's quote stands in the text a person reads (JAVA-797). The server matches the same quote on the
 * stored Markdown with `DocQuoteMatch` (javadaba-api, officium-domain); both compare WORDS -- runs of letters and
 * digits, case-sensitive, in order and next to each other -- because the editor's text and the Markdown differ only
 * by markup and by what the editor holds outside its text (list numbers, a fence's language). The first and last word of the quote may be the tail and the head of longer words. The cases in
 * `comment-quote.test.ts` are the plain-text rows of `DocQuoteMatchTest`: change one and change both.
 */

/** A W3C TextQuoteSelector: the words, and a little of what stands around them to tell places apart. */
export interface CommentQuote {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface QuoteRange {
  start: number;
  end: number;
}

/** What the server accepts: at most this much text on each side of the words. */
export const QUOTE_CONTEXT = 32;
export const QUOTE_EXACT_MAX = 5000;

const WORD = /[\p{L}\p{N}]+/gu;

/** How much text on each side is compared with the quote's prefix and suffix: a bounded window, so scoring costs the same on a huge page. */
const NEIGHBOURS = 512;

interface Word {
  start: number;
  end: number;
  text: string;
}

function wordsOf(value: string): Word[] {
  return Array.from(value.matchAll(WORD), (m) => ({ start: m.index, end: m.index + m[0].length, text: m[0] }));
}

function onlyWords(value: string): string {
  return wordsOf(value)
    .map((w) => w.text)
    .join("");
}

function commonTail(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

function commonHead(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * The page's Markdown as a person reads it, minus markup: what the SERVER matches a quote against (`DocQuoteMatch.text`).
 * The editor never needs it, since its text has no markup; the in-memory repository and the tests do.
 */
export function markdownQuoteText(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "")
    .replace(/^[ \t]*(?:```|~~~)\S*/gm, "")
    .replace(/^[ \t]*(?:>[ \t]*)*\d+[.)][ \t]+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/&#?[A-Za-z0-9]+;/g, "")
    .replace(/\[(?: |x|X|![A-Za-z]+)\]/g, "")
    .replace(/[*~`]/g, "");
}

/** Where the first word of the quote starts inside `word`, or -1. */
function startIn(word: Word, first: string, single: boolean): number {
  if (single) {
    const at = word.text.indexOf(first);
    return at < 0 ? -1 : word.start + at;
  }
  return word.text.endsWith(first) ? word.end - first.length : -1;
}

function endIn(word: Word, last: string, single: boolean): number {
  if (single) {
    const at = word.text.indexOf(last);
    return at < 0 ? -1 : word.start + at + last.length;
  }
  return word.text.startsWith(last) ? word.start + last.length : -1;
}

/**
 * The place in `text` where the quote's words stand. Of several, the one whose neighbours share the most with the
 * quote's prefix and suffix, then the first. `null` means the words are gone.
 */
export function findQuote(text: string, quote: CommentQuote): QuoteRange | null {
  const wanted = wordsOf(quote.exact).map((w) => w.text);
  if (wanted.length === 0) return null;
  const words = wordsOf(text);
  const last = wanted.length - 1;
  const single = wanted.length === 1;
  const prefix = onlyWords(quote.prefix);
  const suffix = onlyWords(quote.suffix);
  let best: QuoteRange | null = null;
  let bestScore = -1;
  for (let i = 0; i + last < words.length; i++) {
    const start = startIn(words[i], wanted[0], single);
    const end = endIn(words[i + last], wanted[last], single);
    if (start < 0 || end < 0) continue;
    let middle = true;
    for (let k = 1; k < last && middle; k++) middle = words[i + k].text === wanted[k];
    if (!middle) continue;
    const score =
      commonTail(onlyWords(text.slice(Math.max(0, start - NEIGHBOURS), start)), prefix) +
      commonHead(onlyWords(text.slice(end, end + NEIGHBOURS)), suffix);
    if (score > bestScore) {
      bestScore = score;
      best = { start, end };
    }
  }
  return best;
}

/** The quote a selection makes: its words, with up to `QUOTE_CONTEXT` characters of text on each side. */
export function quoteOf(text: string, range: QuoteRange): CommentQuote {
  return {
    exact: text.slice(range.start, range.end),
    prefix: text.slice(Math.max(0, range.start - QUOTE_CONTEXT), range.start),
    suffix: text.slice(range.end, range.end + QUOTE_CONTEXT),
  };
}

/** Whether a selection can be a quote at all: it holds a word and is not longer than the server takes. */
export function canQuote(exact: string): boolean {
  return exact.length <= QUOTE_EXACT_MAX && wordsOf(exact).length > 0;
}
