"use client";

import * as React from "react";

import { Button } from "../ui/button";
import { type CivilDate, civilKey, daysBetween } from "./calendar-dates";

import { type CalendarItem, daysFrom, eventsByDay } from "./calendar-events";
import type { CalendarView } from "./calendar-view";
import { startOfDayInstant } from "./calendar-zone";
import { CalendarEventRow } from "./CalendarEventRow";

/*
 * What is next (JAVA-1623, "Month = where, Agenda = what"; Lib-Calendar "Agenda"): the days from
 * `from` on, 14 by default, each with events under a heading with its relative word. An empty window
 * says so ("Nothing in the next 14 days."), says what will fill it and offers New event (with the app's
 * drawing when it passes one as `emptyArt`).
 *
 * It is also an app's slice of the shared calendar: with `source` it lists only what that app added and
 * counts the rest ("2 more this week from other apps") beside `seeAll`, the host's link to everything.
 */

export type CalendarAgendaProps = CalendarView & {
  /** The first day listed. */
  from: CivilDate;
  /** Today, for each day's relative word. */
  today: CivilDate;
  /** How many days the window covers. */
  days?: number;
  items: readonly CalendarItem[];
  /** Only the events this app made, with a count of the others (an app's slice). */
  source?: string;
  /** The host's "Open the calendar" / "Show everything" link, drawn in the footer. */
  seeAll?: React.ReactNode;
  /** A drawing above the empty state (a doodle; this package does not depend on the brand). */
  emptyArt?: React.ReactNode;
  onOpen: (item: CalendarItem) => void;
  /** Offers New event in the empty state, for this day. */
  onNew?: (day: CivilDate) => void;
  /** Draws nothing when the window is empty: a side panel that only adds to what is already there. */
  hideEmpty?: boolean;
};

export function CalendarAgenda({
  from, today, days = 14, items, source, seeAll, emptyArt, zone, formats, labels, onOpen, onNew, hideEmpty = false,
}: CalendarAgendaProps) {
  const span = React.useMemo(() => daysFrom(from, days), [from, days]);
  const byDay = React.useMemo(() => eventsByDay(items, span, zone), [items, span, zone]);
  const listed = span.filter((day) => (byDay.get(civilKey(day)) ?? []).some((item) => !source || item.source === source));
  const others = source ? [...byDay.values()].flat().filter((item) => item.source !== source).length : 0;

  if (listed.length === 0 && others === 0) {
    if (hideEmpty) return null;
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-jd-xl)] bg-[color:var(--jd-card)] px-6 py-10 text-center">
        {emptyArt}
        <p className="text-sm font-semibold">{labels.nothingNext(days)}</p>
        <p className="max-w-sm text-xs text-[color:var(--jd-muted)]">{labels.agendaEmptyHelp}</p>
        {onNew && (
          <Button variant="outline" register="ui" size="sm" className="min-h-11 min-w-11" onClick={() => onNew(from)}>
            {labels.newEvent}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      {listed.map((day) => {
        const heading = formats.dayHeading(startOfDayInstant(day, zone));
        const relative = labels.relativeDay(daysBetween(today, day));
        const rows = (byDay.get(civilKey(day)) ?? []).filter((item) => !source || item.source === source);
        return (
          <section key={civilKey(day)} aria-label={heading} className="flex flex-col gap-1">
            <div className="flex flex-row items-baseline gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">{heading}</h3>
              <span className="text-xs text-[color:var(--jd-muted)]">{relative}</span>
            </div>
            <ul className="flex flex-col">
              {rows.map((item) => (
                <li key={item.id}>
                  <CalendarEventRow item={item} variant="agenda" formats={formats} labels={labels} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {(others > 0 || seeAll) && (
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--jd-muted)]">
          <span>{others > 0 ? labels.moreFromOthers(others, days) : null}</span>
          {seeAll}
        </div>
      )}
    </div>
  );
}
