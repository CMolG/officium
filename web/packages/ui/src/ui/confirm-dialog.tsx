"use client";

import * as React from "react";

import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { FieldHelp } from "./field-help";
import { Input } from "./input";
import { Label } from "./label";
import { promptBlank, useQuestions, type QuestionProps } from "./confirm-dialog.shared";

/*
 * The system's answer to `window.confirm`, `window.prompt` and `window.alert` (JAVA-247).
 *
 * The browser's own dialogs speak the browser's language instead of the product's, cannot say
 * the exact consequence of an irreversible action in a title and a body, look like nothing else
 * on the page, and do not exist on Android. This keeps their one virtue — the caller writes
 * `if (!(await confirm(...))) return;` in the middle of a handler — and draws the question with
 * the system's `Dialog`, so it gets the phone sheet and Back-to-dismiss for free.
 *
 * Labels are required: the system has no i18n, and a default in one language would be the same
 * fault the browser's dialogs have.
 */

export type { AlertOptions, ConfirmOptions, PromptOptions } from "./confirm-dialog.shared";

export function useConfirmDialog() {
  return useQuestions(QuestionDialog);
}

function QuestionDialog({ pending, open }: QuestionProps) {
  const { kind, options, settle } = pending;
  const [value, setValue] = React.useState(kind === "prompt" ? (pending.options.defaultValue ?? "") : "");
  const fieldId = React.useId();
  const hintId = `${fieldId}-hint`;
  const blank = promptBlank(pending, value);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && settle(null)}>
      <DialogContent
        className="max-w-md"
        data-testid="confirm-dialog"
        // The one that cannot be put back interrupts: an alert dialog (Lib-Overlays § useConfirmDialog).
        {...(kind !== "alert" && options.destructive ? { role: "alertdialog" } : {})}
      >
        <form
          className="flex flex-col gap-4 max-sm:flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!blank) settle(value.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>{options.title}</DialogTitle>
            {/* A div, not the default p: the consequence may be a sentence and a list of what goes. */}
            {options.description && (
              <DialogDescription asChild>
                <div className="flex flex-col gap-2 [&_ul]:list-disc [&_ul]:pl-5">{options.description}</div>
              </DialogDescription>
            )}
          </DialogHeader>
          {kind === "prompt" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={fieldId}>{pending.options.label}</Label>
              <Input
                id={fieldId}
                autoFocus
                value={value}
                placeholder={pending.options.placeholder}
                aria-describedby={pending.options.hint ? hintId : undefined}
                onChange={(event) => setValue(event.target.value)}
                data-testid="confirm-dialog-input"
              />
              {pending.options.hint && <FieldHelp id={hintId}>{pending.options.hint}</FieldHelp>}
            </div>
          )}
          <DialogFooter>
            {kind !== "alert" && (
              <Button type="button" register="ui" variant="ghost" onClick={() => settle(null)} data-testid="confirm-dialog-cancel">
                {options.cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              register="ui"
              variant={kind !== "alert" && options.destructive ? "destructive" : "solid"}
              disabled={blank}
              data-testid="confirm-dialog-accept"
            >
              {options.confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
