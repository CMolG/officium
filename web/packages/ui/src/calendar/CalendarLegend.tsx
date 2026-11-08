"use client";

import * as React from "react";

import type { CalendarItem } from "./calendar-events";
import type { CalendarLabels } from "./calendar-labels";

/*
 * What the marks mean (Lib-Calendar): one swatch per app that has an event on the grid, "Yours" for
 * the person's own, then the rule about three marks. It lists only what is on screen, and is
 * silent when nothing is.
 */

export type CalendarLegendProps = {
  items: readonly CalendarItem[];
  labels: CalendarLabels;
};

export function CalendarLegend({ items, labels }: CalendarLegendProps) {
  const entries = new Map<string, string>();
  for (const item of items) {
    const name = item.source ?? labels.yours;
    if (!entries.has(name)) entries.set(name, item.color ?? "var(--jd-ink)");
  }
  if (entries.size === 0) return null;

  return (
    <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1 pt-3">
      {[...entries].map(([name, color]) => (
        <span key={name} className="inline-flex flex-row items-center gap-1.5 text-xs font-medium text-[color:var(--jd-muted)]">
          <i aria-hidden="true" className="block h-1.5 w-4 rounded-[3px]" style={{ background: color }} />
          {name}
        </span>
      ))}
      <span className="text-xs text-[color:var(--jd-faint)]">{labels.legendHelp}</span>
    </div>
  );
}
