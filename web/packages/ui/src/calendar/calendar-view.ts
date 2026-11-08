import type { CalendarFormats } from "./calendar-locale";
import type { CalendarLabels } from "./calendar-labels";

/** What every part of the calendar reads: the zone, the week start, the names and the words. */
export type CalendarView = {
  zone: string;
  firstDay: number;
  formats: CalendarFormats;
  labels: CalendarLabels;
};
