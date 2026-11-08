"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { CardRequest } from "../../lib/backlog/card-requests";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { useCardRequests } from "../../lib/backlog/use-card-requests";

const NONE: readonly CardRequest[] = [];
const CardRequestsContext = createContext<readonly CardRequest[]>(NONE);

/**
 * The board's open "Waiting for you" requests (JAVA-1122), held once so the card faces and the
 * "Needs you" lane read them without a prop through every column. `TaskCard` stays a pure face:
 * it never reads the repository, only this.
 */
export function CardRequestsProvider({ projectId, repository, children }: { projectId: string; repository: BacklogRepository; children: ReactNode }) {
  const { open } = useCardRequests(projectId, repository);
  return <CardRequestsContext.Provider value={open}>{children}</CardRequestsContext.Provider>;
}

/** Every request still waiting for the person. Empty outside the provider. */
export const useOpenRequests = () => useContext(CardRequestsContext);

/** Whether an agent is waiting on this card's person. */
export const useWaitingForYou = (cardId: string) => useContext(CardRequestsContext).some((r) => r.cardId === cardId);
