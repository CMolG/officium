/*
 * @javadaba/ui/calendar on Android (JAVA-1623). The date core, the draft rules and the labels are
 * platform-neutral and ship as they are; the components are web-only until their native twins exist
 * (`notOnAndroid`, as the ui package's `index.native.ts` does).
 */

import { notOnAndroid } from "../not-on-android";

export * from "./core";
export type { CalendarView } from "./calendar-view";
export type CalendarTab = "month" | "agenda";
export const Calendar = notOnAndroid("Calendar");
export const CalendarMonth = notOnAndroid("CalendarMonth");
export const CalendarDayList = notOnAndroid("CalendarDayList");
export const CalendarAgenda = notOnAndroid("CalendarAgenda");
export const CalendarEventForm = notOnAndroid("CalendarEventForm");
export const CalendarReminderChips = notOnAndroid("CalendarReminderChips");
