/*
 * Civil dates: a year, month and day with no time and no zone (JAVA-1623). The month grid is built
 * here, so a DST shift can never move a day: only instants need a zone (calendar-zone.ts).
 */

export type CivilDate = { year: number; month: number; day: number };

const DAY_MS = 86_400_000;

export function civil(year: number, month: number, day: number): CivilDate {
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function epochDay(date: CivilDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / DAY_MS;
}

function fromEpochDay(days: number): CivilDate {
  const date = new Date(days * DAY_MS);
  return civil(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** 0 = Sunday ... 6 = Saturday, the `Date#getDay` convention. */
export function weekday(date: CivilDate): number {
  return new Date(epochDay(date) * DAY_MS).getUTCDay();
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromEpochDay(epochDay(date) + days);
}

/** Moves by whole months, clamping the day to the target month's length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date: CivilDate, months: number): CivilDate {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return civil(year, month, Math.min(date.day, daysInMonth(year, month)));
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return epochDay(a) - epochDay(b);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: CivilDate, to: CivilDate): number {
  return epochDay(to) - epochDay(from);
}

export function civilKey(date: CivilDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

/** The seven weekday numbers in display order, starting at `firstDay` (0 = Sunday). */
export function weekdayOrder(firstDay: number): number[] {
  return Array.from({ length: 7 }, (_, index) => (firstDay + index) % 7);
}

/**
 * The 42 cells (six rows of seven) of a month, starting on the `firstDay` on or before the 1st.
 * Always 42, so the surface keeps its height from one month to the next.
 */
export function monthGrid(year: number, month: number, firstDay: number): CivilDate[] {
  const first = civil(year, month, 1);
  const lead = (weekday(first) - firstDay + 7) % 7;
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function parseCivilKey(key: string): CivilDate {
  const [year, month, day] = key.split("-").map(Number);
  return civil(year, month, day);
}

export function isSameMonth(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month;
}
