"use client";

import { useCallback, type RefObject } from "react";
import { now } from "../constants";
import type { TheaterLatest, TheaterSession } from "./types";

/** How long each scene lasts, and how much of the current one has played. */
export function useTheaterClock(
  latestRef: RefObject<TheaterLatest>,
  sessionRef: RefObject<TheaterSession>,
) {
  const durationOf = useCallback(
    (i: number) =>
      latestRef.current.scenes[i]?.duration ?? latestRef.current.duration,
    [latestRef],
  );

  const getElapsed = useCallback(() => {
    const { elapsed, startedAt } = sessionRef.current;
    return elapsed + (startedAt == null ? 0 : now() - startedAt);
  }, [sessionRef]);

  return { durationOf, getElapsed };
}
