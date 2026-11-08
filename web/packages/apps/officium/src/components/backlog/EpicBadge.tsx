"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Card } from "../../lib/backlog/types";
import { epicColors, epicResolver, unresolvedEpic, type EpicResolver } from "../../lib/backlog/epic-badge";
import type { BoardCard } from "../../lib/backlog/board-copy";

const EpicResolverContext = createContext<EpicResolver>(unresolvedEpic);

/**
 * Hands the card faces below it a way to turn `card.epic` into the epic card it names (JAVA-291),
 * from the cards the view already holds -- the board and the backlog read every card of the
 * project, epics included, even while a sprint filters what they draw. `TaskCard` stays a pure
 * face: it never reads the repository.
 */
export function EpicResolverProvider({ cards, children }: { cards: readonly BoardCard[]; children: ReactNode }) {
  const resolve = useMemo(() => epicResolver(cards), [cards]);
  return <EpicResolverContext.Provider value={resolve}>{children}</EpicResolverContext.Provider>;
}

/** The epic `card` belongs to, or null -- also when the label names the card itself: an epic
 *  often carries its own name as its `epic` (JAVA-49 is "Officium"), and is not its own child. */
export function useEpicRef(card: Pick<Card, "key" | "epic">) {
  const resolve = useContext(EpicResolverContext);
  const epic = card.epic ? resolve(card.epic) : null;
  return epic && epic.key !== card.key ? epic : null;
}

/**
 * The epic next to a card's key: a pastel of its own, stable per epic, and cut with an ellipsis
 * so a long title never widens the card. The full text is in the tooltip; the card's accessible
 * name carries it too, since the card's `aria-label` replaces what its children say.
 */
export function EpicBadge({ text, identity }: { text: string; identity: string }) {
  return (
    <span
      data-epic-badge
      title={`Epic: ${text}`}
      style={epicColors(identity)}
      className="min-w-0 truncate rounded-[var(--radius-jd-sm)] px-1.5 py-px text-[10px] font-semibold leading-4"
    >
      {text}
    </span>
  );
}
