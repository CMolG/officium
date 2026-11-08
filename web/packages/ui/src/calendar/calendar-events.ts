/*
 * What a calendar shows, independent of where it is shown (JAVA-1623). The surface hands in items
 * already loaded for its range; nothing here fetches.
 */

import type { ReactNode } from "react";

import { type CivilDate, addDays, civilKey } from "./calendar-dates";
import { dayKey } from "./calendar-zone";

export type CalendarItem = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  readOnly?: boolean;
  /** Which app made it ("Officium"); an event with no source is the person's own. */
  source?: string;
  /** The source app's color, for the day's mark and the legend. Without it the mark is ink. */
  color?: string;
  /** The source app's seal, drawn beside "From Curriculum" in the agenda (the host passes its own icon). */
  sourceIcon?: ReactNode;
  /**
   * A date, not a time ("OFC-142 due"): the list says "All day" and puts it first. `startsAt` is the day's start.
   * TODO(backend): the calendar events endpoint serves no all-day flag yet, so a host sets this only where its
   * own source knows the event has no time; until the endpoint carries it, personal events read as timed.
   */
  allDay?: boolean;
};

function compareItems(a: CalendarItem, b: CalendarItem): number {
  if (Boolean(a.allDay) !== Boolean(b.allDay)) return a.allDay ? -1 : 1;
  const byStart = a.startsAt.getTime() - b.startsAt.getTime();
  return byStart !== 0 ? byStart : a.title.localeCompare(b.title);
}

/**
 * The items on each cell's day, keyed by `YYYY-MM-DD`. An event that spans several days lands on
 * each of them; one that ends exactly at local midnight does not spill onto the next day.
 */
export function eventsByDay(
  items: readonly CalendarItem[],
  cells: readonly CivilDate[],
  zone: string,
): Map<string, CalendarItem[]> {
  const byDay = new Map<string, CalendarItem[]>(cells.map((cell) => [civilKey(cell), []]));
  for (const item of items) {
    const first = dayKey(item.startsAt, zone);
    const last = item.endsAt && item.endsAt.getTime() > item.startsAt.getTime()
      ? dayKey(new Date(item.endsAt.getTime() - 1), zone)
      : first;
    for (const [key, list] of byDay) {
      if (key >= first && key <= last) list.push(item);
    }
  }
  for (const list of byDay.values()) list.sort(compareItems);
  return byDay;
}

/** The `count` days from `first` on, in order (the cells an agenda of the next N days lists). */
export function daysFrom(first: CivilDate, count: number): CivilDate[] {
  return Array.from({ length: count }, (_, offset) => addDays(first, offset));
}

/** The earliest item that starts later today (in `zone`) at or after `now`, or null. */
export function nextUp(
  items: readonly CalendarItem[],
  now: Date,
  zone: string,
): CalendarItem | null {
  const today = dayKey(now, zone);
  const later = items
    .filter((item) => item.startsAt.getTime() >= now.getTime() && dayKey(item.startsAt, zone) === today)
    .sort(compareItems);
  return later[0] ?? null;
}
