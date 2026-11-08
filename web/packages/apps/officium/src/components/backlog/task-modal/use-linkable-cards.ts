"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useEffect, useRef, useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { Card, CardDetail } from "../../../lib/backlog/types";

export interface LinkableCardsInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  allCards: Omit<Card, "description" | "actionPlan">[];
}

/** The cards a card links to, the board's plus the few it has to fetch itself. */
export function useLinkableCards({ projectId, repository, detail, allCards }: LinkableCardsInput) {
  // The board no longer loads Completed (it has no column), so a linked card may be missing from
  // `allCards`: fetch those few, or "Blocked by" would silently drop a blocker that got completed.
  // Each key is asked for once; one that fails (deleted, say) stays out of the list, as before.
  const [offBoard, setOffBoard] = useState<Card[]>([]);
  const askedFor = useRef(new Set<string>());
  useEffect(() => {
    const known = new Set([...allCards, ...offBoard].map((c) => c.key));
    const missing = [...new Set([...detail.blockedBy, ...detail.blocks, ...detail.related, ...detail.relatedBy.map((r) => r.key)])]
      .filter((key) => !known.has(key) && !askedFor.current.has(key));
    if (missing.length === 0) return;
    missing.forEach((key) => askedFor.current.add(key));
    void Promise.all(missing.map((key) => repository.getCard(projectId, key).catch(() => null))).then((found) =>
      setOffBoard((prev) => [...prev, ...found.filter((card): card is CardDetail => card !== null)]),
    );
  }, [allCards, offBoard, detail.blockedBy, detail.blocks, detail.related, detail.relatedBy, projectId, repository]);
  const linkable = offBoard.length ? [...allCards, ...offBoard] : allCards;
  return linkable;
}
