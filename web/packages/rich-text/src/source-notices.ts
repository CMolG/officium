/*
 * What the Markdown source can hold that the visual editor cannot draw (Lib-RichText 12): the source
 * mode says so, in a line above the text, instead of letting a person find out by losing it.
 */

export const TABLE_ALIGNMENT_NOTICE =
  "This table has a column alignment the visual editor can't show. It stays as written; edit it here.";

/** A GFM table's delimiter row: cells of dashes, a colon at either end where a column is aligned. */
const DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

/** Whether the text has a table whose delimiter row aligns a column (`:---`, `---:`, `:---:`), outside code fences. */
export function hasTableAlignment(markdown: string): boolean {
  let fence: string | null = null;
  for (const line of markdown.split("\n")) {
    const mark = /^\s*(```+|~~~+)/.exec(line)?.[1];
    if (mark) {
      fence = fence === null ? mark[0]! : fence === mark[0] ? null : fence;
      continue;
    }
    if (fence === null && line.includes(":") && line.includes("|") && DELIMITER.test(line)) return true;
  }
  return false;
}
