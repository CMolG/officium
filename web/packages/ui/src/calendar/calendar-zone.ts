/*
 * The only place an instant meets a calendar day (JAVA-1623, D7). Offsets come from `Intl`, so no
 * date library is needed; the zone is the IANA id the device reports and the API stores.
 */

import { type CivilDate, addDays, civilKey } from "./calendar-dates";

const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(zone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(zone, formatter);
  }
  return formatter;
}

/** The wall clock of `instant` in `zone`, read as if it were UTC. */
function wallClockMs(instant: number, zone: string): number {
  const parts = formatterFor(zone).formatToParts(new Date(instant));
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(
    field("year"),
    field("month") - 1,
    field("day"),
    field("hour"),
    field("minute"),
    field("second"),
  );
}

/** Offset of `zone` from UTC at `instant`, in milliseconds (east is positive). */
export function zoneOffsetMs(instant: number, zone: string): number {
  return wallClockMs(instant, zone) - instant;
}

/** The civil day an instant falls on in `zone`, as `YYYY-MM-DD`. */
export function dayKey(instant: Date | number, zone: string): string {
  const time = typeof instant === "number" ? instant : instant.getTime();
  const wall = new Date(wallClockMs(time, zone));
  return civilKey({
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
  });
}

/** The day key and the `HH:MM` wall time of `instant` in `zone`, for pre-filling the form. */
export function zoneWallClock(instant: Date | number, zone: string): { day: string; time: string } {
  const time = typeof instant === "number" ? instant : instant.getTime();
  const wall = new Date(wallClockMs(time, zone));
  const hours = String(wall.getUTCHours()).padStart(2, "0");
  const minutes = String(wall.getUTCMinutes()).padStart(2, "0");
  return { day: dayKey(time, zone), time: `${hours}:${minutes}` };
}

/**
 * The instant of the wall time `minutesIntoDay` past local midnight of `date`, in `zone`. A wall
 * time the zone skips (inside a spring-forward gap) resolves to the instant after the gap.
 */
export function instantAt(date: CivilDate, minutesIntoDay: number, zone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day) + minutesIntoDay * 60_000;
  const candidates = [-DAY_MS, 0, DAY_MS].map((shift) => guess - zoneOffsetMs(guess + shift, zone));
  const exact = candidates.filter((instant) => wallClockMs(instant, zone) === guess);
  return new Date(Math.min(...(exact.length > 0 ? exact : candidates)));
}

/**
 * The instant at which `date` starts in `zone`. Candidates are built from the offsets on either side
 * of the day, so a DST shift at midnight is covered. The earliest candidate whose wall clock falls
 * inside the day wins. A midnight the zone skips resolves to the first instant of that day.
 */
export function startOfDayInstant(date: CivilDate, zone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day);
  const candidates = [-DAY_MS, 0, DAY_MS].map((shift) => guess - zoneOffsetMs(guess + shift, zone));
  const inDay = candidates.filter((instant) => {
    const wall = wallClockMs(instant, zone);
    return wall >= guess && wall < guess + DAY_MS;
  });
  return new Date(Math.min(...(inDay.length > 0 ? inDay : candidates)));
}

/** The half-open range `[from, to)` that covers exactly the cells' days in `zone`. */
export function gridRange(cells: readonly CivilDate[], zone: string): { from: Date; to: Date } {
  const last = cells[cells.length - 1];
  return {
    from: startOfDayInstant(cells[0], zone),
    to: startOfDayInstant(addDays(last, 1), zone),
  };
}
