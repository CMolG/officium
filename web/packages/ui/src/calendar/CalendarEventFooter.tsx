"use client";

import * as React from "react";

import { Button } from "../ui/button";
import type { CalendarLabels } from "./calendar-labels";

/*
 * The form's footer (JAVA-1623, D11; Lib-Calendar "Delete and discard"). Delete sits on the left,
 * away from Save. Delete and discard ask once, as an alert dialog drawn inside the sheet (no modal
 * over a sheet), with focus on the safe choice: Keep it, or Keep editing. Delete asks only because
 * a deleted event cannot come back from the calendar.
 */

export type CalendarConfirm = "delete" | "discard" | null;

export type CalendarEventFooterProps = {
  labels: CalendarLabels;
  mode: "new" | "edit" | "readOnly";
  saving?: boolean;
  confirm: CalendarConfirm;
  onConfirm: (confirm: CalendarConfirm) => void;
  onRequestCancel: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

type Ask = {
  title: string;
  body: string;
  safe: string;
  risky: string;
  destructive: boolean;
  onRisky: () => void;
};

export function CalendarEventFooter({
  labels,
  mode,
  saving,
  confirm,
  onConfirm,
  onRequestCancel,
  onCancel,
  onDelete,
}: CalendarEventFooterProps) {
  const readOnly = mode === "readOnly";
  const id = React.useId();

  const ask: Ask | null =
    confirm === "delete"
      ? { title: labels.deleteAsk, body: labels.deleteBody, safe: labels.keepIt, risky: labels.deleteConfirm, destructive: true, onRisky: () => onDelete?.() }
      : confirm === "discard"
        ? { title: labels.discardAsk, body: labels.discardBody, safe: labels.keepEditing, risky: labels.discard, destructive: false, onRisky: onCancel }
        : null;

  if (ask) {
    return (
      <div
        role="alertdialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4"
      >
        <h3 id={`${id}-title`} className="font-[family-name:var(--font-jd-display)] text-[22px] font-bold leading-tight">
          {ask.title}
        </h3>
        <p id={`${id}-body`} className="text-sm text-[color:var(--jd-muted)]">
          {ask.body}
        </p>
        <div className="flex flex-row flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" register="ui" size="md" className="min-h-11" autoFocus onClick={() => onConfirm(null)}>
            {ask.safe}
          </Button>
          <Button
            type="button"
            variant={ask.destructive ? "destructive" : "solid"}
            register="ui"
            size="md"
            className="min-h-11"
            onClick={ask.onRisky}
          >
            {ask.risky}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-3 pt-2">
      {mode === "edit" ? (
        <Button type="button" variant="ghost" register="ui" size="md" className="min-h-11" disabled={saving} onClick={() => onConfirm("delete")}>
          {labels.delete}
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-row flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" register="ui" size="md" className="min-h-11" onClick={onRequestCancel}>
          {readOnly ? labels.close : labels.cancel}
        </Button>
        {readOnly ? null : (
          <Button type="submit" variant="solid" register="ui" size="md" className="min-h-11" busy={saving}>
            {saving ? labels.saving : labels.save}
          </Button>
        )}
      </div>
    </div>
  );
}
