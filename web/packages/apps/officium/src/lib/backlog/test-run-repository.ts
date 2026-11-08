import type { SuiteTrend, TestRun } from "./test-history-types";

export interface TestRunRepository {
  /** The project's latest full runs, newest first. The runner records them; the web never does. */
  listTestRuns(projectId: string, query?: { limit?: number }): Promise<TestRun[]>;
  /** Each suite's trend over its last `points` runs, growing ones first. */
  listTestSuites(projectId: string, query?: { suite?: string; points?: number }): Promise<SuiteTrend[]>;
}
