import type { Card } from "./types";
import type { BoardCard } from "./board-copy";

/**
 * The epic a card belongs to, as its face shows it (JAVA-291).
 *
 * `card.epic` is free text, written two ways across a real backlog: an epic card's key
 * (`JAVA-155`) or a name several cards share (`Officium`), which is usually the epic card's own
 * `epic` label too. So a label resolves to an epic card by key first, then by that label when
 * exactly ONE epic carries it -- a name several epics share ("Base limpia") names none of them,
 * and shows as written rather than as a guess.
 */
export interface EpicRef {
  /** The epic card's key, or null when the label names no single epic card. */
  key: string | null;
  /** What the badge prints: `KEY Title` when resolved, the label as written otherwise. */
  text: string;
  /** What the color is derived from: the epic card's id when resolved, else the label. */
  identity: string;
}

export type EpicResolver = (label: string) => EpicRef;

export function epicResolver(cards: readonly BoardCard[]): EpicResolver {
  const byKey = new Map<string, BoardCard>();
  const byLabel = new Map<string, BoardCard | null>();
  for (const card of cards) {
    if (card.category !== "epic") continue;
    byKey.set(card.key.toUpperCase(), card);
    const label = card.epic?.trim().toLowerCase();
    if (label) byLabel.set(label, byLabel.has(label) ? null : card);
  }
  return (label) => {
    const epic = byKey.get(label.trim().toUpperCase()) ?? byLabel.get(label.trim().toLowerCase()) ?? null;
    return epic
      ? { key: epic.key, text: `${epic.key} ${epic.title}`, identity: epic.id }
      : { key: null, text: label, identity: label.trim().toLowerCase() };
  };
}

/**
 * How many of `cards` (the whole project) belong to the epic keyed `epicKey` -- a card whose label
 * resolves to it by the rule above; the epic itself never does. The API counts the same way
 * (`EpicChildren.java`, card://JAVA-292) and serves the result as `epicChildren`: this is the
 * in-memory backend's half.
 */
export function epicChildCount(epicKey: string, cards: readonly Card[]): number {
  return epicChildren(epicKey, cards).length;
}

/** The cards that belong to the epic keyed `epicKey`, by the rule above (`EpicChildren.byEpic`). */
export function epicChildren(epicKey: string, cards: readonly Card[]): Card[] {
  const resolve = epicResolver(cards);
  return cards.filter((c) => c.key !== epicKey && c.epic?.trim() && resolve(c.epic).key === epicKey);
}

/** No epic cards known (a surface that never loaded them): every label shows as written. */
export const unresolvedEpic = epicResolver([]);

/**
 * The epic's hue, 0-359. "Random once per epic, then stable" without storing anything: FNV-1a of
 * the epic's identity scatters neighbouring ids across the wheel, and the same id gives the same
 * hue on every card, every reload and every browser.
 */
export function epicHue(identity: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

/** A light pastel on every hue, so one dark ink reads on all of them. */
export const EPIC_SATURATION = 70;
export const EPIC_LIGHTNESS = 88;
/** Whoever sets the background sets the ink (tokens.css, "island rule"): see the token. */
export function epicColors(identity: string): { background: string; color: string } {
  return { background: `hsl(${epicHue(identity)} ${EPIC_SATURATION}% ${EPIC_LIGHTNESS}%)`, color: "var(--officium-epic-ink)" };
}
