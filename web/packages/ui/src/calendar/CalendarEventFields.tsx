"use client";

import * as React from "react";

import { FieldError } from "../ui/field-error";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { type CalendarDraft, type DraftErrors } from "./calendar-draft";
import type { CalendarLabels } from "./calendar-labels";
import { CalendarReminderChips } from "./CalendarReminderChips";

/*
 * The form's fields (JAVA-1623, D9): title, day, start, optional end, notes and reminders. Each
 * control carries its label, `aria-invalid` and `aria-describedby` to its error text.
 */

export type CalendarEventFieldsProps = {
  id: string;
  draft: CalendarDraft;
  errors: DraftErrors;
  labels: CalendarLabels;
  disabled: boolean;
  now: Date;
  startsAt: Date;
  onChange: (draft: CalendarDraft) => void;
};

type TextField = "title" | "day" | "startTime" | "endTime";

export function CalendarEventFields({ id, draft, errors, labels, disabled, now, startsAt, onChange }: CalendarEventFieldsProps) {
  const set = <K extends keyof CalendarDraft>(name: K, value: CalendarDraft[K]) => onChange({ ...draft, [name]: value });
  const fieldId = (name: keyof CalendarDraft) => `${id}-${name}`;
  const errorId = (name: keyof DraftErrors) => (errors[name] ? `${id}-${name}-error` : undefined);
  const controlProps = (name: keyof CalendarDraft, errorKey?: keyof DraftErrors) => ({
    id: fieldId(name),
    disabled,
    "aria-invalid": errorKey && errors[errorKey] ? true : undefined,
    "aria-describedby": errorKey ? errorId(errorKey) : undefined,
  });
  const error = (name: keyof DraftErrors) =>
    errors[name] ? <FieldError id={errorId(name)}>{errors[name]}</FieldError> : null;

  const input = (name: TextField, type: string, label: string) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Label htmlFor={fieldId(name)}>{label}</Label>
      <Input className="h-11"
        type={type}
        value={draft[name]}
        onChange={(event) => set(name, event.target.value)}
        {...controlProps(name, name)}
      />
      {error(name)}
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <Label htmlFor={fieldId("title")}>{labels.fieldTitle}</Label>
        <Input className="h-11" type="text" value={draft.title} onChange={(event) => set("title", event.target.value)} {...controlProps("title", "title")} />
        {error("title")}
      </div>

      <div className="flex flex-row flex-wrap gap-3">
        {input("day", "date", labels.fieldDay)}
        {input("startTime", "time", labels.fieldStart)}
        {input("endTime", "time", labels.fieldEnd)}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={fieldId("notes")}>
          {labels.fieldNotes}
          <small className="ml-1.5 text-xs font-medium text-[color:var(--jd-faint)]">{labels.optional}</small>
        </Label>
        <Textarea
          rows={2}
          value={draft.notes}
          placeholder={labels.notesPlaceholder}
          onChange={(event) => set("notes", event.target.value)}
          {...controlProps("notes")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">{labels.reminders}</span>
        <CalendarReminderChips
          value={draft.reminders}
          startsAt={startsAt}
          now={now}
          labels={labels}
          onChange={(reminders) => set("reminders", reminders)}
        />
        {error("reminders")}
      </div>
    </>
  );
}
