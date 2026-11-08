"use client";

import { useEffect } from "react";

import type { AgentWork, CardDetail } from "../backlog/types";
import { cardPipWidget } from "./card-pip";
import { setWindowPip } from "./window-bridge";

/**
 * Keeps the Host's Picture in picture on the card that is open (MIG-F06). The effect is keyed on the pieces of the
 * widget, not on the objects, so a refetch that changes nothing sends nothing; it takes the widget away when the card
 * closes. Outside a desktop window there is no bridge and this does nothing.
 */
export function useCardPip(detail: CardDetail, agentWork: AgentWork | undefined): void {
  const { key, title, status } = detail;
  const who = agentWork ? (agentWork.actor.agentName ?? agentWork.actor.name) : null;
  const line = agentWork?.statuses[0]?.text ?? null;
  useEffect(() => {
    setWindowPip(cardPipWidget({ key, title, status }, who ? { who, line } : null));
    return () => setWindowPip(null);
  }, [key, title, status, who, line]);
}
