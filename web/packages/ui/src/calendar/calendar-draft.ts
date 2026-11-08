/*
 * The event form's state and its rules (JAVA-1623, D7, D9). Pure: the form renders it, the account
 * container saves it. Times are the zone's wall clock until `draftToEvent` turns them into instants.
 */

import { type CivilDate, parseCivilKey } from "./calendar-dates";
import type { CalendarLabels } from "./calendar-labels";
import { instantAt, zoneWallClock } from "./calendar-zone";

export type CalendarDraft = {
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  notes: string;
  reminders: number[];
};

export type DraftErrors = Partial<Record<"title" | "day" | "startTime" | "endTime" | "reminders", string>>;

export const REMINDER_PRESETS = [0, 5, 15, 30, 60, 1440] as const;
export const MAX_REMINDERS = 5;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A new event on `now`'s day, starting at the next quarter hour at least a minute ahead. With
 * `reminder`, it starts with the At start reminder on (New reminder), else without any.
 */
export function draftForNew(now: Date, zone: string, reminder = false): CalendarDraft {
  const QUARTER_MS = 15 * 60_000;
  const soon = now.getTime() + 60_000;
  const start = zoneWallClock(new Date(Math.ceil(soon / QUARTER_MS) * QUARTER_MS), zone);
  return {
    title: "",
    day: start.day,
    startTime: start.time,
    endTime: "",
    notes: "",
    reminders: reminder ? [0] : [],
  };
}

export function draftFromEvent(event: {
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  notes?: string;
  reminders: readonly number[];
}, zone: string): CalendarDraft {
  const start = zoneWallClock(event.startsAt, zone);
  return {
    title: event.title,
    day: start.day,
    startTime: start.time,
    endTime: event.endsAt ? zoneWallClock(event.endsAt, zone).time : "",
    notes: event.notes ?? "",
    reminders: [...event.reminders].sort((a, b) => a - b),
  };
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export type DraftResult =
  | { ok: true; value: { title: string; notes: string; startsAt: Date; endsAt: Date | null; reminders: number[] } }
  | { ok: false; errors: DraftErrors };

/** Validates the draft and converts it to instants in `zone`. The first failing field names its problem. */
export function draftToEvent(draft: CalendarDraft, zone: string, labels: CalendarLabels): DraftResult {
  const errors: DraftErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = labels.errorTitle;
  if (!DAY.test(draft.day)) errors.day = labels.errorDay;
  if (!TIME.test(draft.startTime)) errors.startTime = labels.errorTime;
  if (draft.endTime && !TIME.test(draft.endTime)) errors.endTime = labels.errorTime;
  if (draft.reminders.length > MAX_REMINDERS) errors.reminders = labels.errorReminders;
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const day: CivilDate = parseCivilKey(draft.day);
  const startsAt = instantAt(day, minutesOf(draft.startTime), zone);
  const endsAt = draft.endTime ? instantAt(day, minutesOf(draft.endTime), zone) : null;
  if (endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { ok: false, errors: { endTime: labels.errorEnd } };
  }
  return {
    ok: true,
    value: { title, notes: draft.notes.trim(), startsAt, endsAt, reminders: [...draft.reminders].sort((a, b) => a - b) },
  };
}

/** A reminder whose moment (start minus its offset) is already before `now`: the server never creates it. */
export function isReminderPast(minutesBefore: number, startsAt: Date, now: Date): boolean {
  return startsAt.getTime() - minutesBefore * 60_000 < now.getTime();
}
