/** What `Progress` takes on both runtimes, and the state it reports. */

export interface ProgressAxes {
  /** Done so far, 0…`max`. Omitted or `null`: indeterminate. */
  value?: number | null;
  max?: number;
  className?: string;
  /** Extra classes for the fill, e.g. an accent instead of the surface's ink. */
  indicatorClassName?: string;
}

export type ProgressState = "indeterminate" | "loading" | "complete";

/** The fill's percentage (`null` when indeterminate) and the state it reads as. */
export function progressMeasure({ value, max = 100 }: Pick<ProgressAxes, "value" | "max">): {
  determinate: boolean;
  pct: number | null;
  state: ProgressState;
} {
  const determinate = typeof value === "number" && Number.isFinite(value) && max > 0;
  const pct = determinate ? Math.min(100, Math.max(0, (value / max) * 100)) : null;
  return { determinate, pct, state: pct === null ? "indeterminate" : pct >= 100 ? "complete" : "loading" };
}
