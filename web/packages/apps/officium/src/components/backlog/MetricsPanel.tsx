"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Input, Note, Select } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Metrics, Sprint } from "../../lib/backlog/types";
import { todayISO } from "../../lib/backlog/format";
import { FIELD_SELECT } from "../../lib/field-select";
import { ComparePeriods } from "./ComparePeriods";
import { MetricsSummary } from "./MetricsSummary";

type PeriodMode = "range" | "sprint";

export function MetricsPanel({ projectId, sprints }: { projectId: string; sprints: Sprint[] }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [mode, setMode] = useState<PeriodMode>("range");
  const [from, setFrom] = useState(() => `${todayISO().slice(0, 8)}01`);
  const [to, setTo] = useState(todayISO);
  const [sprintId, setSprintId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // `sprints` arrives from `ContributionsView`'s own async load, after this component's first
  // render -- picking a default once at mount would always land on `null`. Only while nothing has
  // been chosen yet: it never overrides a person's own selection.
  useEffect(() => {
    if (sprintId === null && sprints.length > 0) {
      setSprintId(sprints.find((s) => s.state === "active")?.id ?? sprints[0]?.id ?? null);
    }
  }, [sprints, sprintId]);

  const [comparing, setComparing] = useState(false);

  // `from`/`to` are read through a ref, not a dependency: typing into the date range must NOT
  // reload on every keystroke (that's what "Apply" is for -- a fetch mid-typed range is wasted
  // work), only when "Apply" is actually pressed or the period MODE / chosen SPRINT changes.
  // Written from an effect, never during render: a ref mutated mid-render is exactly the pattern
  // React Compiler's own lint (`react-hooks/refs`) flags as breaking updates.
  const rangeRef = useRef({ from, to });
  useEffect(() => {
    rangeRef.current = { from, to };
  }, [from, to]);

  const load = useCallback(async () => {
    try {
      const query = mode === "sprint" && sprintId ? { sprintId } : rangeRef.current;
      setMetrics(await repository.getMetrics(projectId, query));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load these metrics.");
    }
  }, [projectId, repository, mode, sprintId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sprintOptions = sprints.map((s) => ({ value: s.id, label: s.name }));

  return (
    <div className="flex flex-col gap-6">
      {/* One control per line on a phone, a wrapping row from `sm` up (JAVA-59: wrapped at 412px,
          each date's label landed on a different line from its field). */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Select
          aria-label="Period"
          value={mode}
          onChange={(v) => setMode(v as PeriodMode)}
          options={[{ value: "range", label: "Date range" }, { value: "sprint", label: "Sprint" }]}
          className={`${FIELD_SELECT} sm:w-auto`}
        />
        {mode === "range" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 sm:h-9" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">To</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 sm:h-9" />
            </label>
          </>
        ) : (
          <Select aria-label="Sprint" value={sprintId} onChange={setSprintId} placeholder="Pick a sprint" options={sprintOptions} className={`${FIELD_SELECT} sm:w-auto`} />
        )}
        <Button type="button" register="ui" variant="outline" size="sm" className="min-h-11 sm:min-h-0" onClick={() => void load()}>
          Apply
        </Button>
        <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:ml-auto sm:min-h-0" onClick={() => setComparing((v) => !v)}>
          {comparing ? "Hide comparison" : "Compare two periods"}
        </Button>
      </div>

      {/* A failed read says what failed and offers the way back in, instead of leaving the tab with no retry (Off-Contrib). */}
      {error && (
        <div className="flex flex-col items-start gap-2">
          <Note tone="danger">
            <span className="font-medium">{error}</span>
          </Note>
          <Button type="button" register="ui" variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      )}

      {!metrics ? (
        <p className="py-10 text-center text-sm text-[color:var(--jd-muted)]" role="status">Loading…</p>
      ) : (
        <MetricsSummary metrics={metrics} projectId={projectId} />
      )}

      {comparing && <ComparePeriods projectId={projectId} sprints={sprints} />}
    </div>
  );
}
