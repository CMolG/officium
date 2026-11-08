"use client";

import { useState } from "react";
import type { TheaterRootProps } from "../types";
import { clamp, EMPTY_SET } from "../constants";
import { useReducedMotion } from "./useReducedMotion";

export type TheaterControllerState = ReturnType<typeof useTheaterState>;

/** The Root's state and what is derived from it; the actions that move it live in their own hooks. */
export function useTheaterState({
  scenes,
  index: indexProp,
  defaultIndex = 0,
  autoplay = true,
}: TheaterRootProps) {
  const count = scenes.length;
  const controlled = indexProp !== undefined;
  const [indexState, setIndexState] = useState(defaultIndex);
  const index = count
    ? clamp(controlled ? indexProp : indexState, 0, count - 1)
    : 0;
  const [cycle, setCycle] = useState(0);
  const reduced = useReducedMotion();
  // Whether to play at all is the site's one setting now (`useAnimations`, held in useTheaterEngine):
  // reduced motion starts the site paused unless the person pressed Play, so the Theater needs no
  // opinion of its own. Only the cross-fade still reads `reduced`.
  const [want, setWant] = useState(autoplay);
  const [ended, setEnded] = useState(false);
  const [holds, setHolds] = useState<ReadonlySet<string>>(EMPTY_SET);
  const [interactive, setInteractive] = useState(true);
  const playing = want && holds.size === 0 && count > 0;

  return {
    count,
    controlled,
    index,
    setIndexState,
    cycle,
    setCycle,
    reduced,
    want,
    setWant,
    ended,
    setEnded,
    holds,
    setHolds,
    interactive,
    setInteractive,
    playing,
  };
}
