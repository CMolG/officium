/*
 * The platform-neutral part of the calendar (JAVA-1623): civil dates, zones, locale, events, the key
 * map, the form's draft rules and the labels. Both entries re-export it; neither draws anything.
 */

export {
  type CivilDate,
  addDays,
  addMonths,
  civil,
  civilKey,
  compareCivil,
  daysBetween,
  daysInMonth,
  isSameMonth,
  monthGrid,
  parseCivilKey,
  weekday,
  weekdayOrder,
} from "./calendar-dates";
export { dayKey, gridRange, instantAt, startOfDayInstant, zoneOffsetMs, zoneWallClock } from "./calendar-zone";
export { calendarFormats, firstDayOfWeek, resolveCalendarLocale, type CalendarFormats } from "./calendar-locale";
export { type CalendarItem, daysFrom, eventsByDay, nextUp } from "./calendar-events";
export { nextFocusedDay } from "./calendar-keys";
export {
  type CalendarDraft,
  type DraftErrors,
  type DraftResult,
  MAX_REMINDERS,
  REMINDER_PRESETS,
  draftForNew,
  draftFromEvent,
  draftToEvent,
  isReminderPast,
} from "./calendar-draft";
export { type CalendarLabels, DEFAULT_CALENDAR_LABELS, resolveCalendarLabels } from "./calendar-labels";
