"use client";

import * as React from "react";

import { FOCUS_RING } from "../lib/focus-ring";
import type { CalendarItem } from "./calendar-events";
import type { CalendarView } from "./calendar-view";

/*
 * One event in a list (Lib-Calendar `.ev`): the source's mark, the title, then the time and who
 * made it ("18:00 to 18:30 · yours"). The mark takes the color of the app that made the event, but
 * the line always names it, so color is never the only channel. A row is one button that opens the
 * event where it came from.
 *
 * `variant="agenda"` is the next-days list: the time (or "All day") in a column of its own, then the
 * title over "From Curriculum" with the app's seal when the item carries one.
 */

export type CalendarEventRowProps = Pick<CalendarView, "formats" | "labels"> & {
  item: CalendarItem;
  variant?: "day" | "agenda";
  onOpen: (item: CalendarItem) => void;
};

const ROW =
  "flex min-h-11 w-full flex-row items-start gap-3 rounded-[var(--radius-jd-md)] p-3 text-left text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-card)] " + FOCUS_RING;

export function CalendarEventRow({ item, formats, labels, variant = "day", onOpen }: CalendarEventRowProps) {
  const start = formats.time(item.startsAt);
  const range = item.endsAt && item.endsAt.getTime() > item.startsAt.getTime() ? labels.timeRange(start, formats.time(item.endsAt)) : start;
  const when = item.allDay ? labels.allDay : range;
  const who = item.source ?? labels.yours;
  const mark = (
    <span aria-hidden="true" className="mt-1 block h-4 w-1.5 shrink-0 rounded-full" style={{ background: item.color ?? "var(--jd-ink)" }} />
  );

  if (variant === "agenda") {
    return (
      <button type="button" onClick={() => onOpen(item)} className={ROW}>
        <span className="w-16 shrink-0 text-xs font-semibold tabular-nums text-[color:var(--jd-muted)]">{item.allDay ? labels.allDay : start}</span>
        {mark}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{item.title}</span>
          <span className="flex flex-row items-center gap-1.5 text-xs text-[color:var(--jd-muted)]">
            {item.sourceIcon}
            {item.source ? labels.fromSource(item.source) : labels.yours}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(item)} className={ROW}>
      {mark}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{item.title}</span>
        <span className="text-xs text-[color:var(--jd-muted)]">{`${when} · ${who}`}</span>
      </span>
    </button>
  );
}
