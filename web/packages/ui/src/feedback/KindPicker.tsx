"use client";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { FeedbackLabels } from "./labels";
import type { FeedbackKind } from "./submit";

const KINDS: FeedbackKind[] = ["problem", "suggestion"];

/**
 * Problem or Suggestion as a two-part segmented control (Lib-Feedback `.seg`): a stone track, the chosen
 * part in ink. Each part is a toggle button (`aria-pressed`), so the choice is announced and never told
 * apart by color alone.
 */
export function KindPicker({ kind, labels, disabled, onChange }: { kind: FeedbackKind; labels: FeedbackLabels; disabled: boolean; onChange: (kind: FeedbackKind) => void }) {
  return (
    <div role="group" aria-label={labels.kindName} className="flex flex-row gap-1 rounded-xl bg-[color:var(--jd-card)] p-1">
      {KINDS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={kind === option}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-9 flex-1 cursor-pointer rounded-lg px-3 text-[13px] font-semibold transition-colors pointer-coarse:min-h-11 disabled:cursor-not-allowed",
            kind === option ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]" : "text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-hover)]",
            FOCUS_RING,
          )}
        >
          {option === "problem" ? labels.kindProblem : labels.kindSuggestion}
        </button>
      ))}
    </div>
  );
}
