import type { BacklogRepository } from "./repository";
import type { Card, CardQuery } from "./types";

/** Big enough that a real backlog is two or three round trips, not six. */
const PAGE_SIZE = 200;

/**
 * Every card a query matches, following `nextCursor` to the end. Callers pass a narrowing query
 * (`category`, `status`, `jql`): a project-wide read is what JAVA-1633 removed from the screens.
 *
 * `listCards` returns ONE page (50 by default), and until 2026-09-22 the board asked for one page
 * and drew it as if it were the whole backlog. The page is sorted by each card's order WITHIN its
 * column, so a backlog the size of this repository's own (284 cards, 114 of them finished) came
 * back as the first few of every column, and nothing said the rest were missing -- the finished
 * ones included. The board's own catch-up read is `listChanges` (JAVA-45).
 */
export async function listAllCards(
  repository: BacklogRepository,
  projectId: string,
  query: Omit<CardQuery, "cursor" | "limit"> = {},
): Promise<Card[]> {
  const cards: Card[] = [];
  let cursor: string | undefined;
  do {
    const page = await repository.listCards(projectId, { ...query, cursor, limit: PAGE_SIZE });
    cards.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return cards;
}
