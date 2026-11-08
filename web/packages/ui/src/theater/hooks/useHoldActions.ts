"use client";

import {
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { EmitEvent, TheaterLatest } from "./types";

/** Temporary holds (hover, offscreen, hidden tab, loading) that stop the clock without changing the user's intent. */
export function useHoldActions(
  latestRef: RefObject<TheaterLatest>,
  emit: EmitEvent,
  setHolds: Dispatch<SetStateAction<ReadonlySet<string>>>,
) {
  const hold = useCallback(
    (key: string) => {
      if (key === "hover" && latestRef.current.playing)
        emit({ type: "pause", reason: "hover" });
      setHolds((h) => (h.has(key) ? h : new Set(h).add(key)));
    },
    [emit, latestRef, setHolds],
  );

  const release = useCallback(
    (key: string) => {
      const { want, playing } = latestRef.current;
      if (key === "hover" && want && !playing)
        emit({ type: "play", reason: "hover" });
      setHolds((h) => {
        if (!h.has(key)) return h;
        const n = new Set(h);
        n.delete(key);
        return n;
      });
    },
    [emit, latestRef, setHolds],
  );

  return { hold, release };
}
