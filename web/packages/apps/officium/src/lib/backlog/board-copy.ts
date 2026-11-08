import type { Card, CardChanges } from "./types";
import { isClosed } from "./status-config";

/**
 * The board's local copy (JAVA-45, user request 2026-09-24): the cards it showed last and the
 * server instant they are good as of. The next visit paints from it at once and asks only for
 * what changed since (`GET …/cards/changes?since=`); only a board with no copy loads in full.
 *
 * The copy lives in IndexedDB (`local-store/board-store.ts`, JAVA-1575). This file keeps the
 * shapes and the catch-up's merge, and the one `localStorage` copy an earlier version left behind.
 */
export interface BoardCopy {
  asOf: string;
  cards: BoardCard[];
}

/** What the board keeps of a card: `changes` sends no `description` or `actionPlan`; the modal reads them from `getCard`. */
export type BoardCard = CardChanges["cards"][number];

/** A copy written before JAVA-1375 holds both texts per card; they leave on its next write. */
export function boardFace(card: Card | BoardCard): BoardCard {
  const { description: _description, actionPlan: _actionPlan, ...face } = card as Card;
  return face;
}

const legacyKeyOf = (projectId: string) => `officium:board:v2:${projectId}`;

/**
 * The `localStorage` copy of JAVA-45 and JAVA-1375: read once, removed, and returned for the
 * IndexedDB store to take. A v1 copy (no hours, JAVA-1376) and a blocked storage are dropped.
 */
export function takeLegacyBoardCopy(projectId: string): BoardCopy | null {
  try {
    localStorage.removeItem(`officium:board:v1:${projectId}`);
    const key = legacyKeyOf(projectId);
    const copy = JSON.parse(localStorage.getItem(key) ?? "null") as BoardCopy | null;
    localStorage.removeItem(key);
    return copy && typeof copy.asOf === "string" && Array.isArray(copy.cards)
      ? { asOf: copy.asOf, cards: copy.cards.map(boardFace) }
      : null;
  } catch {
    return null;
  }
}

/**
 * Applies a catch-up to the board's cards. A card that did not change keeps its OBJECT, and when
 * nothing changed the same array comes back: React then re-renders nothing and no card moves,
 * which is what stops the flicker -- the server re-sends the last minute on every catch-up, and
 * the stream reconnects every minute. A card moved to Completed or Rejected leaves the board.
 */
export function mergeChanges(current: BoardCard[], changes: CardChanges): BoardCard[] {
  const byId = new Map(current.map((card) => [card.id, card]));
  let changed = false;
  for (const id of changes.removed) changed = byId.delete(id) || changed;
  for (const card of changes.cards) {
    const had = byId.get(card.id);
    if (isClosed(card.status)) {
      changed = byId.delete(card.id) || changed;
    } else if (!had || JSON.stringify(had) !== JSON.stringify(card)) {
      byId.set(card.id, card);
      changed = true;
    }
  }
  return changed ? [...byId.values()] : current;
}

/**
 * The incoming cards that differ from what is held, by id and content (JAVA-1633). The server
 * re-sends the last minute on every catch-up, so a surface that reacts to a card hears only these.
 */
export function differingFaces(held: BoardCard[], incoming: BoardCard[]): BoardCard[] {
  const known = new Map(held.map((card) => [card.id, JSON.stringify(card)]));
  return incoming.filter((card) => known.get(card.id) !== JSON.stringify(card));
}
