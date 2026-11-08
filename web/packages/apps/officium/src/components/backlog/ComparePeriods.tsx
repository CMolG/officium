"use client";

import { useMemo, useState } from "react";

import { Button, Select } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Metrics, Sprint } from "../../lib/backlog/types";
import { currentIsoWeek, isoWeekToRange } from "../../lib/backlog/format";
import { FIELD_SELECT } from "../../lib/field-select";
import { MetricsComparison } from "./MetricsComparison";

type CompareMode = "week" | "sprint";

/** The "Compare two periods" controls of Contributions and the comparison they produce. */
export function ComparePeriods({ projectId, sprints }: { projectId: string; sprints: Sprint[] }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [compareMode, setCompareMode] = useState<CompareMode>("week");
  const [weekA, setWeekA] = useState(currentIsoWeek);
  const [weekB, setWeekB] = useState(currentIsoWeek);
  const [sprintA, setSprintA] = useState<string | null>(null);
  const [sprintB, setSprintB] = useState<string | null>(null);
  const [metricsA, setMetricsA] = useState<Metrics | null>(null);
  const [metricsB, setMetricsB] = useState<Metrics | null>(null);

  const sprintOptions = sprints.map((s) => ({ value: s.id, label: s.name }));

  async function runComparison() {
    const queryFor = (week: string, sprint: string | null): { from: string; to: string } | { sprintId: string } | null => {
      if (compareMode === "week") return isoWeekToRange(week);
      return sprint ? { sprintId: sprint } : null;
    };
    const qa = queryFor(weekA, sprintA);
    const qb = queryFor(weekB, sprintB);
    if (!qa || !qb) return;
    const [ma, mb] = await Promise.all([repository.getMetrics(projectId, qa), repository.getMetrics(projectId, qb)]);
    setMetricsA(ma);
    setMetricsB(mb);
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Select
          aria-label="Comparison mode"
          value={compareMode}
          onChange={(v) => setCompareMode(v as CompareMode)}
          options={[{ value: "week", label: "Week" }, { value: "sprint", label: "Sprint" }]}
          className={`${FIELD_SELECT} sm:w-auto`}
        />
        {compareMode === "week" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Period A</span>
              <input type="week" value={weekA} onChange={(e) => setWeekA(e.target.value)} className="h-11 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] px-2 text-sm sm:h-9" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Period B</span>
              <input type="week" value={weekB} onChange={(e) => setWeekB(e.target.value)} className="h-11 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] px-2 text-sm sm:h-9" />
            </label>
          </>
        ) : (
          <>
            <Select aria-label="Period A" value={sprintA} onChange={setSprintA} placeholder="Sprint A" options={sprintOptions} className={`${FIELD_SELECT} sm:w-auto`} />
            <Select aria-label="Period B" value={sprintB} onChange={setSprintB} placeholder="Sprint B" options={sprintOptions} className={`${FIELD_SELECT} sm:w-auto`} />
          </>
        )}
        <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" onClick={() => void runComparison()}>
          Compare
        </Button>
      </div>

      {metricsA && metricsB && <MetricsComparison a={metricsA} b={metricsB} />}
    </div>
  );
}
