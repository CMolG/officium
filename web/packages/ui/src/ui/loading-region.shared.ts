"use client";

import { useEffect, useState } from "react";

/** How long a load may run before its stand-in shows. A load that answers inside it never flashes one. */
export const LOADING_DELAY_MS = 300;

export interface LoadingRegionAxes {
  /** One spoken label for the whole region. Also printed when `showLabel` is set. */
  label?: string;
  loading: boolean;
  /** Milliseconds before the stand-in is shown. `0` shows it at once. */
  delayMs?: number;
  /** Print `label` as visible text under the bones, as the settings sheets do. */
  showLabel?: boolean;
  className?: string;
  /** Classes of the box the stand-in sits in (web only). Default `h-full`; a list whose rows wrap sets its own flex. */
  fallbackClassName?: string;
}

/**
 * Whether the stand-in is shown yet. The bones are mounted while loading and held invisible for the
 * delay, so the box is reserved from the first paint and nothing moves when they appear.
 */
export function useStandInShown(loading: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!loading || delayMs === 0) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [loading, delayMs]);
  return loading && (delayMs === 0 || elapsed);
}
