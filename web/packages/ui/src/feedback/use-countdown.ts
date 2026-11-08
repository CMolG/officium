"use client";

import * as React from "react";

/**
 * Counts `seconds` down to 0, one tick a second, and restarts when `seconds` changes (a new pause).
 * `null` is no countdown: the number stays 0. The send button of a rate-limited report wakes up on its own with it.
 */
export function useCountdown(seconds: number | null): number {
  const [left, setLeft] = React.useState(seconds ?? 0);
  React.useEffect(() => {
    setLeft(seconds ?? 0);
    if (!seconds) return;
    const id = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  return left;
}
