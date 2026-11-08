import type { SortKey } from "../../components/backlog/TopBar";
import { PRIORITY_CONFIG, STATUS_CONFIG, STATUS_ORDER } from "./status-config";
import type { BoardCard } from "./board-copy";
import type { Status } from "./types";

/**
 * The comparator every view sorts with -- board columns, list and stack alike, so "Sort by"
 * means the same thing wherever the card is. Defaults to priority, as in the concept: a
 * column reads Critical first, and ties fall back to the oldest card, then the stored order.
 */
export function compareCards(sortKey: SortKey, loggedOf: (cardId: string) => number) {
  const byPriority = (a: BoardCard, b: BoardCard) =>
    PRIORITY_CONFIG[a.priority].weight - PRIORITY_CONFIG[b.priority].weight
    || a.createdAt.localeCompare(b.createdAt)
    || a.order - b.order;
  switch (sortKey) {
    case "createdDesc":
      return (a: BoardCard, b: BoardCard) => b.createdAt.localeCompare(a.createdAt);
    case "createdAsc":
      return (a: BoardCard, b: BoardCard) => a.createdAt.localeCompare(b.createdAt);
    case "updatedDesc":
      return (a: BoardCard, b: BoardCard) => b.updatedAt.localeCompare(a.updatedAt);
    case "estimateDesc":
      return (a: BoardCard, b: BoardCard) => b.estimate - a.estimate;
    case "loggedDesc":
      return (a: BoardCard, b: BoardCard) => loggedOf(b.id) - loggedOf(a.id);
    case "priority":
      return byPriority;
    default:
      return (a: BoardCard, b: BoardCard) => STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order || byPriority(a, b);
  }
}

export function groupByStatus(cards: BoardCard[], compare: (a: BoardCard, b: BoardCard) => number): Record<Status, BoardCard[]> {
  const groups = Object.fromEntries(STATUS_ORDER.map((s) => [s, [] as BoardCard[]])) as Record<Status, BoardCard[]>;
  for (const card of cards) groups[card.status]?.push(card);
  for (const status of STATUS_ORDER) groups[status].sort(compare);
  return groups;
}
