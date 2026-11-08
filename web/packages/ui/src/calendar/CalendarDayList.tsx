"use client";

import * as React from "react";

import { type CivilDate } from "./calendar-dates";
import type { CalendarItem } from "./calendar-events";
import type { CalendarView } from "./calendar-view";
import { startOfDayInstant } from "./calendar-zone";
import { CalendarEventRow } from "./CalendarEventRow";

/*
 * The selected day's events, beside or under the grid (JAVA-1623). It is what makes every cell do
 * something on a phone: a cell selects its day, and this list carries the titles and who made each
 * event. The heading says "Sunday 25 · today" when it is. New event lives in the calendar's header.
 */

export type CalendarDayListProps = CalendarView & {
  day: CivilDate;
  isToday?: boolean;
  items: readonly CalendarItem[];
  onOpen: (item: CalendarItem) => void;
};

export function CalendarDayList({ day, isToday = false, items, zone, formats, labels, onOpen }: CalendarDayListProps) {
  const heading = formats.dayHeading(startOfDayInstant(day, zone));

  return (
    <section aria-label={heading} className="flex flex-col gap-2 pt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">
        {isToday ? `${heading} · ${labels.todayMark}` : heading}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--jd-muted)]">{labels.noEventsThisDay}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <CalendarEventRow item={item} formats={formats} labels={labels} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
