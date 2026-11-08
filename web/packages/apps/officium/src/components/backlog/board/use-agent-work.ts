"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useEffect, useMemo } from "react";

import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { AgentWork } from "../../../lib/backlog/types";

export interface AgentWorkInput {
  working: AgentWork[];
  cards: BoardCard[] | null;
  refreshWorking: () => Promise<void>;
}

/** Which cards an agent works on, and the look-again when a session expires. */
export function useAgentWork({ working, cards, refreshWorking }: AgentWorkInput) {
  // The server expires a session its agent stopped reporting on, but sends no event when it
  // does -- so look again right after the earliest `expiresAt`, or a dead agent's card would
  // keep its snake until something else happened to refresh the board.
  useEffect(() => {
    if (working.length === 0) return;
    const earliest = Math.min(...working.map((w) => Date.parse(w.expiresAt)));
    const timer = setTimeout(() => void refreshWorking(), Math.max(0, earliest - Date.now()) + 1000);
    return () => clearTimeout(timer);
  }, [working, refreshWorking]);

  const workingByCard = useMemo(() => new Map(working.map((w) => [w.cardId, w])), [working]);
  const isWorking = useCallback((cardId: string) => workingByCard.has(cardId), [workingByCard]);
  const workingItems = useMemo(
    () =>
      working.flatMap((work) => {
        const card = cards?.find((c) => c.id === work.cardId);
        return card ? [{ work, card }] : [];
      }),
    [working, cards],
  );

  return { workingByCard, isWorking, workingItems };
}

export type AgentWorkState = ReturnType<typeof useAgentWork>;
