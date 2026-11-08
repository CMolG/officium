"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isLive, type CardRequest } from "./card-requests";
import type { BacklogRepository } from "./repository";

export interface CardRequests {
  /** The project's live requests, oldest first. */
  requests: CardRequest[];
  /** The ones still waiting for the person. */
  open: CardRequest[];
  /** The live request of a card, if it has one. */
  byCard: Map<string, CardRequest>;
  refresh: () => Promise<void>;
}

/**
 * A project's live "Waiting for you" requests (JAVA-1122), read again on every `card.request`
 * and on `stream.ready` (the stream reopened: catch up whatever changed while it was down).
 * Monitoring, like agent work: it refetches only itself, never the cards.
 */
export function useCardRequests(projectId: string, repository: BacklogRepository): CardRequests {
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const next = (await repository.listRequests(projectId)).filter(isLive);
      if (ticket === latest.current) setRequests(next);
    } catch {
      // A missed read is not worth an error banner; the next event or refresh recovers it.
    }
  }, [projectId, repository]);

  useEffect(() => {
    const unsubscribe = repository.subscribe(projectId, (event) => {
      if (event.type === "card.request" || event.type === "stream.ready") void refresh();
    });
    // The first read happens a microtask later, like an event's would: not inside the effect's body.
    queueMicrotask(() => void refresh());
    return unsubscribe;
  }, [projectId, repository, refresh]);

  return useMemo(
    () => ({
      requests,
      open: requests.filter((r) => r.status === "open"),
      byCard: new Map(requests.map((r) => [r.cardId, r])),
      refresh,
    }),
    [requests, refresh],
  );
}
