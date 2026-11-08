"use client";

import type { ReactNode } from "react";

export interface BeforeAfterProps {
  /** Drawn on the left, clipped by the handle. */
  before: ReactNode;
  /** Drawn underneath and in flow: it sets the height of the pair. */
  after: ReactNode;
  /** Percent of the width that shows `before`. 0 rests fixed on `after`. */
  position: number;
  onPositionChange: (position: number) => void;
  label: string;
  beforeLabel: string;
  afterLabel: string;
}

/**
 * Two stacked layers and a handle. The range input is the control: it gives the slider role,
 * keyboard and touch drag with no new dependency. It covers both layers, transparent, and the
 * visible grip is drawn over it without taking pointer events.
 */
export function BeforeAfter({
  before,
  after,
  position,
  onPositionChange,
  label,
  beforeLabel,
  afterLabel,
}: BeforeAfterProps) {
  const shown = Math.min(100, Math.max(0, position));
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The input comes first so the grip after it can read its focus through `peer`. */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={shown}
        aria-label={label}
        aria-valuetext={shown < 50 ? afterLabel : beforeLabel}
        onChange={(event) => onPositionChange(Number(event.currentTarget.value))}
        className="peer absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
      />
      <div role="group" aria-label={afterLabel} className="h-full w-full">
        {after}
      </div>
      <div
        role="group"
        aria-label={beforeLabel}
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - shown}% 0 0)` }}
      >
        {before}
      </div>
      {/* At rest on `after` (0) the line would be a dark edge with nothing to show it moves: the grip alone says it is a control. */}
      {shown > 0 && (
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-[color:var(--jd-ink)]"
          style={{ left: `${shown}%` }}
          aria-hidden="true"
        />
      )}
      {/* The grip clamps at the edges (its own width moves it, no calc): at 0 it sits inside the frame, on the left edge. */}
      <div
        className="pointer-events-none absolute top-1/2 flex size-11 items-center justify-center rounded-full bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)] shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--jd-accent)]"
        style={{ left: `${shown}%`, transform: `translate(-${shown}%, -50%)` }}
        aria-hidden="true"
      >
        <span className="text-xs font-semibold">&lsaquo;&rsaquo;</span>
      </div>
    </div>
  );
}
