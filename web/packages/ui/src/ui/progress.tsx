import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";
import { progressMeasure, type ProgressAxes } from "./progress.shared";

/*
 * Progress — how far along something is (Lib-Display § Progress · Skeleton · LoadingRegion;
 * the design's `.meter`: 10 px, radius 5, a track at 10% ink and an ink fill).
 *
 * Nothing spins without a sentence beside it: the caller writes what is being waited for above the
 * bar ("Exporting EPUB  62%") and a second line below ("Chapter 8 of 13"). `aria-label` names the bar.
 *
 * Born in the subset Yoga can draw (ADR 0015): the fill is full width and slides with a
 * **transform**, never a `width` transition. Under reduced motion it jumps instead of sliding.
 *
 * States: a number is determinate (`data-state="loading"`, then `"complete"` at the end); `null` or
 * no value is indeterminate, work under way with no measure of how much is left, and the fill
 * breathes in place rather than pretending to a percentage.
 */

export interface ProgressProps extends ProgressAxes, Omit<HTMLAttributes<HTMLDivElement>, "role" | "children" | "className"> {}

export function Progress({ value, max = 100, className, indicatorClassName, ...rest }: ProgressProps) {
  const { determinate, pct, state } = progressMeasure({ value, max });

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? (value ?? undefined) : undefined}
      data-state={state}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-[5px] bg-[color:var(--jd-ink)]/10", className)}
      {...rest}
    >
      <div
        className={cn(
          "h-full w-full rounded-[5px] bg-[color:var(--jd-ink)] transition-transform duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] motion-reduce:transition-none",
          pct === null && "motion-safe:animate-jd-bone",
          indicatorClassName,
        )}
        // Indeterminate shows a third of the track, so it reads as "working", not "empty".
        style={{ transform: `translateX(-${100 - (pct ?? 33)}%)` }}
      />
    </div>
  );
}
