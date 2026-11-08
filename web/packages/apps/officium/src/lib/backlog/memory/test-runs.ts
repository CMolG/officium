import type { Actor } from "../types";
import type { SuiteTrend, SuiteTrendPoint, TestRun } from "../test-history-types";
import { ApiError } from "../api-error";
import { newId } from "../format";
import { suiteTrend } from "../suite-trend";
import { now } from "./rules";
import { MemoryOrganization } from "./organization";

/** The project's test-run history (officium-api.md §8.12), apart from the pages so `docs.ts` keeps its ceiling (JAVA-801). */
export class MemoryTestRuns extends MemoryOrganization {
  // ---- test-run history (officium-api.md §8.12) ----------------------------------------------

  async listTestRuns(projectId: string, query: { limit?: number } = {}): Promise<TestRun[]> {
    this.count("listTestRuns");
    const record = this.requireRecord(projectId);
    return [...record.testRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, query.limit ?? 20)
      .map((run) => ({ ...run, suites: run.suites.map((suite) => ({ ...suite })) }));
  }

  async listTestSuites(projectId: string, query: { suite?: string; points?: number } = {}): Promise<SuiteTrend[]> {
    this.count("listTestSuites");
    const record = this.requireRecord(projectId);
    const recent = [...record.testRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, query.points ?? 30);
    const series = new Map<string, SuiteTrendPoint[]>();
    for (const run of recent) {
      for (const suite of run.suites) {
        const points = series.get(suite.name) ?? [];
        points.push({ ref: run.ref, startedAt: run.startedAt, ok: suite.ok, seconds: suite.seconds });
        series.set(suite.name, points);
      }
    }
    return [...series.entries()]
      .filter(([name]) => !query.suite || name === query.suite)
      .map(([name, points]) => suiteTrend(name, points))
      .sort((a, b) => Number(b.growing) - Number(a.growing) || a.suite.localeCompare(b.suite));
  }

  /** What `POST /officium/v1/tests/ingest` does, with the project's pipeline token: idempotent on
   *  `(machine, startedAt)`. Not part of `BacklogRepository`: only the mock hooks stand in for the runner. */
  ingestTestRun(
    token: string,
    run: { ref: string; branch?: string; machine?: string; startedAt: string; finishedAt?: string; suites: TestRun["suites"] },
  ): TestRun {
    const record = [...this.records.values()].find((r) => r.changelogToken?.token === token);
    if (!record) throw new ApiError("invalid_token", "This token records nothing", 401);
    if (run.suites.length === 0) throw new ApiError("suites_required", "A run reports at least one suite", 400);
    const machine = run.machine ?? "";
    const existing = record.testRuns.find((r) => r.machine === machine && r.startedAt === run.startedAt);
    if (existing) return { ...existing };
    const actor: Actor = { kind: "agent", accountId: "acc-you", name: "Test runner", agentName: "Test runner" };
    const stored: TestRun = {
      id: newId("run"), ref: run.ref, branch: run.branch ?? "", machine, startedAt: run.startedAt,
      finishedAt: run.finishedAt ?? null, failed: run.suites.filter((suite) => !suite.ok).length,
      totalSeconds: run.suites.reduce((sum, suite) => sum + suite.seconds, 0), suites: run.suites.map((suite) => ({ ...suite })),
      recordedBy: actor, recordedAt: now(),
    };
    record.testRuns.push(stored);
    this.emit(record.project.id, { type: "tests.changed", actor });
    return { ...stored };
  }
}
