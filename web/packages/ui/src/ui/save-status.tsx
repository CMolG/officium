import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { Spinner } from "./spinner";

/*
 * SaveStatus: where autosave stands, in words (Lib-Calendar, "Autosave · six states, always in
 * words"). Saving is always reported in words, never only by an icon: the dot, the arc and the
 * shapes are decoration beside a sentence. It lives in the product bar's slot or under a long form.
 * The state comes from `useAutosave` (`@javadaba/ui/hooks`); this draws it and decides nothing.
 *
 *   idle      "All changes saved"      nothing new
 *   pending   "Unsaved changes"        saves in a moment
 *   saving    "Saving"                 an arc turns
 *   saved     "Saved"                  fades to idle; polite
 *   offline   "Offline, kept here"     syncs on return
 *   failed    "Not saved · Try again"  an alert, with the way to retry
 *
 * Leaving with unsaved changes asks once, and leaving while saving waits for it: that is the
 * editor's guard (`useAutosave().unsaved`), not this line's.
 */

export type SaveState = "idle" | "pending" | "saving" | "saved" | "offline" | "failed";

export interface SaveStatusLabels {
  idle: string;
  pending: string;
  saving: string;
  saved: string;
  offline: string;
  failed: string;
  retry: string;
}

export const SAVE_STATUS_LABELS_EN: SaveStatusLabels = {
  idle: "All changes saved",
  pending: "Unsaved changes",
  saving: "Saving",
  saved: "Saved",
  offline: "Offline, kept here",
  failed: "Not saved",
  retry: "Try again",
};

export interface SaveStatusProps {
  status: SaveState;
  /** Called by the Try again button of a failed save. Without it a failure says so and offers nothing. */
  onRetry?: () => void;
  /** More to say after the failure (a quota, a conflict): shown beside "Not saved". */
  failure?: ReactNode;
  labels?: Partial<SaveStatusLabels>;
  className?: string;
}

function mark(status: SaveState): ReactNode {
  switch (status) {
    case "pending":
      return <span aria-hidden="true" className="block size-1.5 shrink-0 rounded-full bg-[color:var(--jd-warn)]" />;
    case "saving":
      return <Spinner size={14} />;
    case "saved":
      return <Glyph name="check" size={14} />;
    case "offline":
      return <Glyph name="clock" size={14} />;
    case "failed":
      return <Glyph name="alert-triangle" size={14} />;
    default:
      return null;
  }
}

export function SaveStatus({ status, onRetry, failure, labels, className }: SaveStatusProps) {
  const words = { ...SAVE_STATUS_LABELS_EN, ...labels };
  const failed = status === "failed";
  return (
    <span
      role={failed ? "alert" : "status"}
      data-jd-component="SaveStatus"
      data-state={status}
      className={cn(
        "inline-flex flex-row flex-wrap items-center gap-1.5 text-xs font-medium",
        failed ? "text-[color:var(--jd-bad)]" : "text-[color:var(--jd-muted)]",
        className,
      )}
    >
      {mark(status)}
      <span>{words[status]}</span>
      {failed && failure ? <span>{failure}</span> : null}
      {failed && onRetry ? (
        <>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold text-[color:var(--jd-ink)] underline decoration-1 underline-offset-4 hover:decoration-2 pointer-coarse:min-h-11"
          >
            {words.retry}
          </button>
        </>
      ) : null}
    </span>
  );
}
