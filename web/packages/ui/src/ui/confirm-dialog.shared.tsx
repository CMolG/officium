import * as React from "react";

/*
 * What `useConfirmDialog` means on both runtimes (JAVA-247, JAVA-1486): the question types and the
 * promise machinery. `confirm-dialog.tsx` (web) and `confirm-dialog.native.tsx` (Android) each
 * pass the component that draws a question, because a web form and a native sheet share no markup.
 */

interface DialogTexts {
  title: string;
  /** The consequence, in full. What the person is about to lose, and whether it comes back. */
  description?: React.ReactNode;
  confirmLabel: string;
}

export interface ConfirmOptions extends DialogTexts {
  cancelLabel: string;
  /** Irreversible: the confirm button takes the destructive fill. */
  destructive?: boolean;
}

export interface PromptOptions extends DialogTexts {
  cancelLabel: string;
  /** The field's visible label. The confirm button stays disabled while the field is blank. */
  label: string;
  defaultValue?: string;
  placeholder?: string;
  /** The line under the field ("Everyone in the project sees the new name.", "The button turns on when it matches."). */
  hint?: string;
  /** Typed confirmation: the confirm button stays disabled until the trimmed text equals this exactly. */
  mustMatch?: string;
  /** Irreversible: the confirm button takes the destructive fill, as on a plain confirmation. */
  destructive?: boolean;
}

export type AlertOptions = DialogTexts;

export type Pending =
  | { kind: "confirm"; options: ConfirmOptions; settle: (answer: string | null) => void }
  | { kind: "prompt"; options: PromptOptions; settle: (answer: string | null) => void }
  | { kind: "alert"; options: AlertOptions; settle: (answer: string | null) => void };

export interface QuestionProps {
  pending: Pending;
  open: boolean;
}

/**
 * `confirm` resolves `true`/`false`, `prompt` the trimmed text or `null`, `alert` once it is
 * acknowledged. Dismissing the dialog any other way (Escape, a press outside, Back, the phone
 * sheet's close) is the cancel answer. Render `dialog` anywhere in the caller's tree.
 */
export function useQuestions(Question: React.ComponentType<QuestionProps>) {
  // The last question stays rendered, closed, after it is answered: the layer defers its unmount
  // until the exit animation ends, and dropping the node would make it vanish instead.
  const [shown, setShown] = React.useState<{ pending: Pending; id: number; open: boolean } | null>(null);
  const open = React.useRef<Pending | null>(null);
  const asked = React.useRef(0);

  const ask = React.useCallback(<T,>(make: (settle: (answer: string | null) => void) => Pending, read: (answer: string | null) => T) =>
    new Promise<T>((resolve) => {
      // A second question while one is open answers the first with its cancel.
      open.current?.settle(null);
      const next = make((answer) => {
        if (open.current === next) {
          open.current = null;
          setShown((current) => (current?.pending === next ? { ...current, open: false } : current));
        }
        resolve(read(answer));
      });
      open.current = next;
      asked.current += 1;
      setShown({ pending: next, id: asked.current, open: true });
    }), []);

  const confirm = React.useCallback(
    (options: ConfirmOptions) => ask((settle) => ({ kind: "confirm", options, settle }), (answer) => answer !== null),
    [ask],
  );
  const prompt = React.useCallback(
    (options: PromptOptions) => ask((settle) => ({ kind: "prompt", options, settle }), (answer) => answer),
    [ask],
  );
  const alert = React.useCallback(
    (options: AlertOptions) => ask((settle) => ({ kind: "alert", options, settle }), () => undefined),
    [ask],
  );

  const dialog = shown ? <Question key={shown.id} pending={shown.pending} open={shown.open} /> : null;
  return { confirm, prompt, alert, dialog };
}

/** Whether a prompt's confirm button must stay disabled for `value`. */
export function promptBlank(pending: Pending, value: string): boolean {
  if (pending.kind !== "prompt") return false;
  const mustMatch = pending.options.mustMatch;
  return !value.trim() || (mustMatch !== undefined && value.trim() !== mustMatch);
}
