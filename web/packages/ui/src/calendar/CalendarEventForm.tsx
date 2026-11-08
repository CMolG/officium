"use client";

import * as React from "react";

import { Button } from "../ui/button";
import { InlineLink } from "../ui/inline-link";
import { Note } from "../ui/note";
import { type CalendarDraft, type DraftErrors } from "./calendar-draft";
import { type CalendarView } from "./calendar-view";
import { CalendarEventFields } from "./CalendarEventFields";
import { CalendarEventFooter, type CalendarConfirm } from "./CalendarEventFooter";

/*
 * The event form (JAVA-1623, D9 to D12). It owns the confirmation state and the Escape key; the
 * fields and the footer render their own parts. One alert summarizes every error. A read-only event
 * (published by another context) shows every field disabled, with its source and an Open link.
 */

export type CalendarEventFormProps = CalendarView & {
  mode: "new" | "edit" | "readOnly";
  draft: CalendarDraft;
  initial: CalendarDraft;
  errors: DraftErrors;
  now: Date;
  startsAt: Date;
  saving?: boolean;
  source?: string;
  link?: string;
  /** The source app's seal, drawn small beside "From <source>" on a read-only event. */
  sourceIcon?: React.ReactNode;
  /** A read-only event's reminder is still the person's own: when given, the form offers to change it. */
  onChangeReminder?: () => void;
  notice?: React.ReactNode;
  onChange: (draft: CalendarDraft) => void;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
};

export function CalendarEventForm(props: CalendarEventFormProps) {
  const { mode, draft, initial, errors, now, startsAt, saving, source, link, sourceIcon, onChangeReminder, notice, labels, onChange, onSave, onDelete, onCancel } = props;
  const [confirm, setConfirm] = React.useState<CalendarConfirm>(null);
  const id = React.useId();
  const readOnly = mode === "readOnly";
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const errorList = Object.values(errors).filter((message): message is string => Boolean(message));

  const requestCancel = () => {
    if (readOnly || !dirty) onCancel();
    else setConfirm("discard");
  };

  const onFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape" && confirm === null) {
      event.preventDefault();
      requestCancel();
    }
  };

  return (
    <form
      aria-label={mode === "new" ? labels.newEvent : mode === "edit" ? labels.editEvent : labels.viewEvent}
      onSubmit={(event) => {
        event.preventDefault();
        if (!readOnly) onSave();
      }}
      onKeyDown={onFormKeyDown}
      className="flex flex-col gap-4"
    >
      {notice}
      {errorList.length > 0 ? (
        <Note tone="danger">
          {errorList.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </Note>
      ) : null}
      {readOnly && source ? (
        <p className="flex flex-row items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">
          {sourceIcon}
          {labels.fromSource(source)}
        </p>
      ) : null}

      <CalendarEventFields
        id={id}
        draft={draft}
        errors={errors}
        labels={labels}
        disabled={readOnly || Boolean(saving)}
        now={now}
        startsAt={startsAt}
        onChange={onChange}
      />

      {readOnly && (link || onChangeReminder) ? (
        <Note tone="neutral" icon={null} className="flex-col">
          {source ? <span>{labels.readOnlyNotice(source)} </span> : null}
          {link ? (
            <InlineLink href={link}>{source ? labels.openIn(source) : labels.open}</InlineLink>
          ) : null}
        </Note>
      ) : null}
      {readOnly && onChangeReminder ? (
        <div className="flex flex-row">
          <Button type="button" variant="outline" register="ui" size="md" className="min-h-11" onClick={onChangeReminder}>
            {labels.changeReminder}
          </Button>
        </div>
      ) : null}

      <CalendarEventFooter
        labels={labels}
        mode={mode}
        saving={saving}
        confirm={confirm}
        onConfirm={setConfirm}
        onRequestCancel={requestCancel}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </form>
  );
}
