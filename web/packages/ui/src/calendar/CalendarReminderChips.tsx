"use client";

import * as React from "react";

import { FOCUS_RING } from "../lib/focus-ring";
import { type CalendarLabels } from "./calendar-labels";
import { REMINDER_PRESETS, isReminderPast } from "./calendar-draft";

/*
 * Reminder toggles (JAVA-1623, D9). The presets, plus any offset the event already has that is not a
 * preset, so an edit never drops one silently. A moment already past is disabled with its reason in
 * words: the server would never create that reminder.
 */

export type CalendarReminderChipsProps = {
  value: readonly number[];
  startsAt: Date;
  now: Date;
  labels: CalendarLabels;
  onChange: (next: number[]) => void;
};

export function CalendarReminderChips({ value, startsAt, now, labels, onChange }: CalendarReminderChipsProps) {
  const offsets = [...new Set([...REMINDER_PRESETS, ...value])].sort((a, b) => a - b);

  const toggle = (minutes: number) => {
    const on = value.includes(minutes);
    const next = on ? value.filter((item) => item !== minutes) : [...value, minutes];
    onChange(next.sort((a, b) => a - b));
  };

  return (
    <div role="group" aria-label={labels.reminders} className="flex flex-row flex-wrap gap-2">
      {offsets.map((minutes) => {
        const past = isReminderPast(minutes, startsAt, now);
        const pressed = value.includes(minutes);
        const name = minutes === 0 ? labels.atStart : labels.reminderBefore(labels.duration(minutes));
        return (
          <button
            key={minutes}
            type="button"
            aria-pressed={pressed}
            disabled={past}
            onClick={() => toggle(minutes)}
            className={[
              "flex min-h-11 flex-col justify-center rounded-full px-3 text-left text-xs font-semibold",
              FOCUS_RING,
              pressed
                ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]"
                : "bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)] shadow-[inset_0_0_0_1px_var(--jd-control-border)] hover:shadow-[inset_0_0_0_1.5px_var(--jd-ink)]",
              past ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            <span>{name}</span>
            {past ? <span className="text-[10px] font-medium opacity-80">{labels.alreadyPassed}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
