"use client";

import { useEffect, useState } from "react";
import { Badge, Button } from "@javadaba/ui";
import { Timer } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { formatDate } from "../../lib/backlog/format";
import type { SuiteTrend, TestRun } from "../../lib/backlog/test-history-types";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

const seconds = (value: number) => (value >= 100 ? `${Math.round(value)} s` : `${value.toFixed(1)} s`);

/**
 * The test-run history (JAVA-766, officium-api.md §8.12): every full run the project's runner
 * posted, and per suite whether it is getting slower. A suite is flagged only against its own recent
 * median, with a floor in seconds, so the machine's noise never reads as a regression.
 *
 * Read-only: runs come from `scripts/local-tests.mjs` with the pipeline token, never from here.
 */
export function TestHistoryPanel({ projectId, repository }: { projectId: string; repository: BacklogRepository }) {
  const [suites, setSuites] = useState<SuiteTrend[] | null>(null);
  const [runs, setRuns] = useState<TestRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repository.listTestSuites(projectId), repository.listTestRuns(projectId, { limit: 5 })]).then(
      ([nextSuites, nextRuns]) => {
        if (cancelled) return;
        setSuites(nextSuites);
        setRuns(nextRuns);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt, tick]);

  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (event.type === "tests.changed" || event.type === "stream.ready") setTick((n) => n + 1);
      }),
    [projectId, repository],
  );

  const growing = suites?.filter((suite) => suite.growing).length ?? 0;

  return (
    <section aria-labelledby="test-history-heading" className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="test-history-heading" className="text-xl font-bold">
          Test history
        </h2>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
          How long each test suite takes, run after run, so a suite that slowly gets slower shows up before it
          costs everyone minutes. A suite is flagged when its latest passing run is clearly above its own recent
          median.
        </p>
      </div>

      {suites === null || runs === null ? (
        error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
            <p className="text-sm font-semibold">Couldn&apos;t load the test history</p>
            <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
            <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              <span>Try again</span>
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-[color:var(--jd-muted)]">
            Loading the test history…
          </p>
        )
      ) : runs.length === 0 ? (
        <div
          data-testid="test-history-empty"
          className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6"
        >
          <Timer size={22} className="text-[color:var(--jd-muted)]" aria-hidden="true" />
          <p className="text-base font-semibold">No test runs yet</p>
          <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
            Runs arrive on their own once the project&apos;s test runner has the pipeline token: the owner connects
            it under Changelog, and every full run of the suites is recorded here.
          </p>
        </div>
      ) : (
        <>
          <p role="status" className="text-sm font-medium" data-testid="test-history-summary">
            {growing === 0
              ? `No suite is getting slower. Last run ${formatDate(runs[0].startedAt)} on ${runs[0].machine || "an unnamed machine"}, ${runs[0].failed === 0 ? "all passing" : `${runs[0].failed} failing`}.`
              : `${growing} ${growing === 1 ? "suite is" : "suites are"} getting slower.`}
          </p>
          <ul className="flex flex-col gap-3" aria-label="Suites">
            {suites.map((suite) => (
              <SuiteRow key={suite.suite} trend={suite} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** One suite: its latest time, its median, and its recent runs as bars, oldest on the left. The
 *  verdict is words as well as color (interface-psychology #4). */
function SuiteRow({ trend }: { trend: SuiteTrend }) {
  const latest = trend.latest;
  const oldestFirst = [...trend.points].reverse();
  const max = Math.max(...oldestFirst.map((point) => point.seconds), 1);
  // The verdict measures the latest PASSING run, as the API does: a failed run is fast for the wrong reason.
  const measured = trend.points.find((point) => point.ok) ?? null;
  const delta =
    trend.median !== null && measured !== null && trend.median > 0
      ? Math.round(((measured.seconds - trend.median) / trend.median) * 100)
      : null;

  return (
    <li
      data-testid="suite-row"
      data-suite={trend.suite}
      className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4"
    >
      <div className="flex flex-row flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{trend.suite}</span>
        {latest !== null && !latest.ok && (
          <Badge register="tag" tone="danger" fill="subtle">
            <span>Last run failed</span>
          </Badge>
        )}
        {trend.growing && (
          <Badge register="tag" tone="warning" fill="subtle">
            <span>{`Getting slower${delta !== null ? `: +${delta}% vs median` : ""}`}</span>
          </Badge>
        )}
        {!trend.growing && (latest === null || latest.ok) && (
          <Badge register="tag" tone="success" fill="subtle">
            <span>Steady</span>
          </Badge>
        )}
      </div>
      <div className="flex flex-row flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-[color:var(--jd-muted)]">Latest </span>
          <span className="font-semibold">{latest ? seconds(latest.seconds) : "—"}</span>
        </span>
        <span>
          <span className="text-[color:var(--jd-muted)]">Recent median </span>
          <span className="font-semibold">{trend.median !== null ? seconds(trend.median) : "not enough runs yet"}</span>
        </span>
        <span className="text-[color:var(--jd-muted)]">{`${trend.points.length} ${trend.points.length === 1 ? "run" : "runs"}`}</span>
      </div>
      <div
        role="img"
        aria-label={`${trend.suite}, oldest to newest: ${oldestFirst.map((point) => `${seconds(point.seconds)}${point.ok ? "" : " failed"}`).join(", ")}`}
        className="flex h-10 flex-row items-end gap-0.5"
      >
        {oldestFirst.map((point) => (
          <div
            key={`${point.ref}-${point.startedAt}`}
            title={`${point.ref} · ${formatDate(point.startedAt)} · ${seconds(point.seconds)}${point.ok ? "" : " · failed"}`}
            className={`min-w-1 flex-1 rounded-t-sm ${point.ok ? "bg-[color:var(--jd-ink)]/30" : "bg-destructive/70"}`}
            style={{ height: `${Math.max(4, (point.seconds / max) * 100)}%` }}
          />
        ))}
      </div>
    </li>
  );
}
