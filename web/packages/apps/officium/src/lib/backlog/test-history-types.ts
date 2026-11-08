import type { Actor } from "./types";

/** How one suite did in a test run (officium-api.md §8.12, JAVA-766). */
export interface TestSuiteResult {
  name: string;
  ok: boolean;
  seconds: number;
}

/** One full test run, as the project's runner posted it with the pipeline token. */
export interface TestRun {
  id: string;
  /** The commit it ran on. */
  ref: string;
  branch: string;
  machine: string;
  startedAt: string;
  finishedAt: string | null;
  failed: number;
  totalSeconds: number;
  suites: TestSuiteResult[];
  recordedBy: Actor;
  recordedAt: string;
}

export interface SuiteTrendPoint {
  ref: string;
  startedAt: string;
  ok: boolean;
  seconds: number;
}

/**
 * A suite over its last runs. `median` is of the passing runs before the latest passing one;
 * `growing` when that one is over 125% of it and 10 s above, with 5 runs to compare (§8.12).
 */
export interface SuiteTrend {
  suite: string;
  /** The newest run, passing or not; null only for a suite with no points. */
  latest: SuiteTrendPoint | null;
  median: number | null;
  growing: boolean;
  /** Newest first. */
  points: SuiteTrendPoint[];
}
