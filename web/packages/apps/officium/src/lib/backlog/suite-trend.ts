import type { SuiteTrend, SuiteTrendPoint } from "./test-history-types";

/**
 * The in-memory backend's copy of the API's `SuiteTrend` (officium-api.md §8.12), so the demo and
 * the e2e specs answer what the server would. The thresholds are the contract's, not a choice here.
 */
export const TREND_WINDOW = 10;
export const TREND_MIN_HISTORY = 5;
export const TREND_RATIO_PERCENT = 125;
export const TREND_MIN_DELTA_SECONDS = 10;

/** `points` newest first. */
export function suiteTrend(suite: string, points: SuiteTrendPoint[]): SuiteTrend {
  const passing = points.filter((point) => point.ok);
  const latest = points[0] ?? null;
  if (passing.length === 0) return { suite, latest, median: null, growing: false, points };
  const measured = passing[0];
  const before = passing.slice(1, TREND_WINDOW + 1);
  const median = before.length === 0 ? null : medianOf(before.map((point) => point.seconds));
  const growing =
    median !== null &&
    before.length >= TREND_MIN_HISTORY &&
    measured.seconds * 100 > median * TREND_RATIO_PERCENT &&
    measured.seconds - median >= TREND_MIN_DELTA_SECONDS;
  return { suite, latest, median, growing, points };
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
