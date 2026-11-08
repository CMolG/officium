"use client";

import { ICON_LOOP } from "../icons";
import { useTheater } from "../hooks/useTheater";

/** Says the end runs into the start. Icon and word share one centre line. */
export function TheaterLoops() {
  const { labels } = useTheater();
  return (
    <span className="theater__loops" title={labels.loopsHint}>
      {ICON_LOOP}
      {labels.loops}
    </span>
  );
}
