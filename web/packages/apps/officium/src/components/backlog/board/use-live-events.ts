"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useEffect, useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { ChangeEvent, LiveStatus } from "../../../lib/backlog/types";

export interface LiveEventsInput {
  projectId: string;
  repository: BacklogRepository;
  schedule: (depth: "cards" | "all") => Promise<void>;
  refreshWorking: () => Promise<void>;
}

/** The live stream's status, and what each event asks the board to reload. */
export function useLiveEvents({ projectId, repository, schedule, refreshWorking }: LiveEventsInput) {
  const [live, setLive] = useState<LiveStatus>("live");

  // Live updates (officium-api.md §4, "reconnect = refetch"): the memory repository emits
  // synchronously in-process today; JDB-226 swaps the transport for real SSE behind the exact
  // same `subscribe()` method, so this effect does not change.
  useEffect(() => {
    const unsubscribe = repository.subscribe(projectId, (event: ChangeEvent) => {
      switch (event.type) {
        case "card.working":
          void refreshWorking();
          break;
        // The machine coming and going changes no card: only an open card's attachments care, and
        // `TaskModal` listens for it itself. Nor does a request (JAVA-1122): `CardRequestsProvider` reads it.
        case "card.request":
        case "project.machine":
        // Nor does a card going into someone's agent-window queue (§4.3).
        case "card.queue":
        // Nor does an autoloop beating or taking an order (JAVA-1528): its button reads it.
        case "autoloop.changed":
          break;
        // The stream (re)opened -- every minute, when the edge closes it: catch up what may have
        // changed while it was down, which is usually nothing, and costs nothing on screen.
        case "stream.ready":
          void refreshWorking();
          void schedule("cards");
          break;
        case "project.updated":
        case "project.archived":
        case "project.unarchived":
        case "member.changed":
        case "sprint.changed":
          void schedule("all");
          break;
        default:
          void schedule("cards");
      }
    }, setLive);
    return unsubscribe;
  }, [projectId, repository, schedule, refreshWorking]);

  return live;
}
