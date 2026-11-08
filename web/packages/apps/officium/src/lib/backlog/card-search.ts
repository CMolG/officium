import type { Card } from "./types";

/** What the search box reads of a card: the board's cards and the backlog's both carry it. */
export type Searchable = Pick<Card, "key" | "title" | "excerpt" | "epic" | "tags">;

/**
 * Whether `card` answers a search box's text (the board's and the backlog's, one matcher): the
 * text, trimmed and case-insensitive, appears in the key, title, excerpt, epic or a tag. An empty
 * text matches everything.
 */
export function matchesSearch(card: Searchable, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    card.key.toLowerCase().includes(q) ||
    card.title.toLowerCase().includes(q) ||
    card.excerpt.toLowerCase().includes(q) ||
    (card.epic ?? "").toLowerCase().includes(q) ||
    card.tags.some((t) => t.toLowerCase().includes(q))
  );
}
