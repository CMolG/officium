"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onPresenceChange, onVisibilityChange, presenceState } from "@javadaba/sdk/platform";

import { USES_MEMORY_BACKEND } from "../backlog/get-repository";
import { apiSummonsClient } from "./summons-api";
import { createMemorySummonsClient } from "./summons-memory";
import { pickShown, type Summons, type SummonsClient } from "./summons";

let memoryClient: SummonsClient | null = null;

function client(): SummonsClient {
  if (!USES_MEMORY_BACKEND) return apiSummonsClient;
  memoryClient ??= createMemorySummonsClient();
  return memoryClient;
}

export interface SummonsState {
  /** The summons to show now, or null. */
  shown: Summons | null;
  failed: boolean;
  refresh: () => void;
  later: () => void;
}

/**
 * What the summons host needs (JAVA-1145, JAVA-1624): the account's open summons, read again when the
 * server says one changed (the `summons` frame, or the stream reopening) and when the tab is looked at
 * again (a hidden tab has no stream). `named` is the summons a link opened: it shows even snoozed.
 * Seen is posted when the summons shows in a tab that is visible and focused.
 */
export function useSummons(named: string | null): SummonsState {
  const [candidate, setCandidate] = useState<Summons | null>(null);
  const [failed, setFailed] = useState(false);
  const [snoozedLocally, setSnoozedLocally] = useState<Set<string>>(() => new Set());
  const latest = useRef(0);
  const reported = useRef<string | null>(null);
  const seenReported = useRef<string | null>(null);

  const refresh = useCallback(() => {
    const ticket = ++latest.current;
    client()
      .list()
      .then((next) => {
        if (ticket !== latest.current) return;
        setCandidate(pickShown(next, Date.now(), named));
        setFailed(false);
      })
      .catch(() => {
        if (ticket === latest.current) setFailed(true);
      });
  }, [named]);

  useEffect(() => {
    queueMicrotask(refresh);
    const stopStream = client().subscribe(refresh);
    const stopVisible = onVisibilityChange((hidden) => {
      if (!hidden) refresh();
    });
    return () => {
      stopStream();
      stopVisible();
    };
  }, [refresh]);

  // A round the person snoozed here stays hidden until the server starts another (new id or round).
  const key = candidate ? `${candidate.id}:${candidate.round}` : null;
  const shown = candidate && key !== null && !snoozedLocally.has(key) ? candidate : null;

  useEffect(() => {
    if (!shown || key === null) return;
    const post = (seen: boolean) => {
      void client().shown(shown.id, seen).catch(() => {
        // Seen is history: a missed post never gets in the way of answering.
      });
    };
    const isSeen = ({ visible, focused }: { visible: boolean; focused: boolean }) => visible && focused;
    if (reported.current !== key) {
      reported.current = key;
      seenReported.current = isSeen(presenceState()) ? key : null;
      post(seenReported.current === key);
    }
    if (seenReported.current === key) return;
    // A round pushed to a background tab is shown hidden: it is seen once the person looks at it.
    return onPresenceChange((state) => {
      if (!isSeen(state) || seenReported.current === key) return;
      seenReported.current = key;
      post(true);
    });
  }, [shown, key]);

  const later = useCallback(() => {
    if (!shown || key === null) return;
    setSnoozedLocally((current) => new Set(current).add(key));
    void client().snooze(shown.id).catch(() => {
      // The toasts are already gone here; the server asks again at its next round either way.
    });
  }, [shown, key]);

  return { shown, failed, refresh, later };
}
