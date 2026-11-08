/*
 * The grid's keyboard model as a pure map from a key to the next focused day (JAVA-1623). Arrows
 * move by a day or a week, Home and End by the row's edges, PageUp and PageDown by a month
 * (Shift by a year). Returns null for a key the grid does not handle.
 */

import { type CivilDate, addDays, addMonths, weekday } from "./calendar-dates";

export function nextFocusedDay(current: CivilDate, key: string, firstDay: number, shift = false): CivilDate | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(current, -1);
    case "ArrowRight":
      return addDays(current, 1);
    case "ArrowUp":
      return addDays(current, -7);
    case "ArrowDown":
      return addDays(current, 7);
    case "Home":
      return addDays(current, -((weekday(current) - firstDay + 7) % 7));
    case "End":
      return addDays(current, 6 - ((weekday(current) - firstDay + 7) % 7));
    case "PageUp":
      return addMonths(current, shift ? -12 : -1);
    case "PageDown":
      return addMonths(current, shift ? 12 : 1);
    default:
      return null;
  }
}
