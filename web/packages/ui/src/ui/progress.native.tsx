import { View } from "react-native";

import { cn } from "../lib/cn";
import { progressMeasure, type ProgressAxes } from "./progress.shared";

/*
 * Progress on Android: the same track and fill, with the fill sized by `width` percent. The web
 * slides a full-width fill with a transform; on Android a percentage width is the plain way and
 * the bar jumps instead of easing (reduced motion's behavior on the web). Indeterminate shows a
 * third of the track, like the web, announced as a progress bar with no value.
 */

export type ProgressProps = ProgressAxes & { "aria-label"?: string };

export function Progress({ value, max = 100, className, indicatorClassName, "aria-label": ariaLabel }: ProgressProps) {
  const { determinate, pct, state } = progressMeasure({ value, max });
  return (
    <View
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? value ?? undefined : undefined}
      aria-busy={state === "indeterminate" || undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-ink)]/[0.10]", className)}
    >
      <View
        className={cn("h-full bg-[color:var(--jd-ink)]", indicatorClassName)}
        style={{ width: `${pct ?? 33}%` }}
      />
    </View>
  );
}
