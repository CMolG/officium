/*
 * Toast: the types and the numbers every half reads (JAVA-1620). No React, no DOM: the store, the
 * viewport and the tests take the same constants from here.
 */

export type ToastVariant = "default" | "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  /** Runs on click; the toast is dismissed after it, whichever of `action` or `cancel` was pressed. */
  onClick: () => void;
}

export interface ToastOptions {
  /** Replaces the toast already showing (or queued) with this id, in place, and restarts its clock. */
  id?: string;
  description?: string;
  /** Milliseconds on screen once the toast is visible. `Infinity` is sticky. Default 6 s plus 1 s per 120 characters. */
  duration?: number;
  /** The product the news comes from: drawn in bold before the news, "Officium · Builder finished OFC-142". */
  app?: string;
  /** The product's icon (an image URL), drawn at 20 px before the line. Without one the variant's shape is. */
  icon?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  cancel?: ToastAction;
}

export interface ToastLabels {
  dismiss: string;
  /** The name of the region that holds the toasts, for a screen reader's landmark list. */
  region: string;
  variant: Record<ToastVariant, string>;
  /** The hint under the stack while toasts wait for a free place. */
  waiting: (count: number) => string;
  /** The stack's own name and its way to clear every toast at once. */
  stack: (count: number) => string;
  dismissAll: string;
  /** Inside a dialog only the count shows ("2 notifications waiting"), with a way to read them in place. */
  waitingInDialog: (count: number) => string;
  show: string;
  hide: string;
}

export const DEFAULT_TOAST_LABELS: ToastLabels = {
  dismiss: "Dismiss",
  region: "Notifications",
  variant: { default: "Notice", success: "Success", error: "Error", info: "Information", warning: "Warning" },
  waiting: (count) => `${count} more waiting`,
  stack: (count) => `${count} notifications`,
  dismissAll: "Dismiss all",
  waitingInDialog: (count) => `${count} ${count === 1 ? "notification" : "notifications"} waiting`,
  show: "Show",
  hide: "Hide",
};

/** Toasts on screen at once, exits included: a fourth waits in a FIFO queue, it is never dropped. They stack (newest in front), so three is not a pile. */
export const MAX_VISIBLE = 3;

/** How long a timed toast stays: 6 s, plus one more per 120 characters of what it says (Lib-Overlays § toast()). */
export const DEFAULT_DURATION = 6000;
const CHARS_PER_EXTRA_SECOND = 120;

/** The exit's length: the value of `--jd-dur-fast`. The store ends it with its own timer, not `animationend`. */
export const EXIT_MS = 150;

/** A duration the store can run: positive and finite, or `Infinity` for a sticky toast. Anything else is the default for `text`. */
export function resolveDuration(duration: number | undefined, text = ""): number {
  if (typeof duration === "number" && duration > 0) return duration;
  return DEFAULT_DURATION + Math.floor(text.length / CHARS_PER_EXTRA_SECOND) * 1000;
}
