"use client";

import { Button } from "@javadaba/ui";

import { runLabel } from "../../../lib/backlog/role-matrix";
import type { WorkflowRun } from "./use-workflow-run";

/** What fills an empty workflow slot: the workflow session, on the model the project gives the refine cell (JAVA-1592). */
export function EmptyWorkflow({ run, onRetry, epic }: { run: WorkflowRun; onRetry: () => void; epic?: string | null }) {
  if (run.state === "loading") {
    return <p role="status" className="text-sm text-[color:var(--jd-muted)]">No workflow yet. Reading the model it runs on…</p>;
  }
  if (run.state === "error") {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p role="alert">No workflow yet. The model it runs on could not be read.</p>
        <Button type="button" register="ui" variant="outline" className="min-h-11" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  const on = run.run ? ` on ${runLabel(run.run)}` : "";
  // A card of an epic takes its epic's workflow, written once for all of them (JAVA-1885).
  const text = epic
    ? `No workflow yet. A short session writes it once on its epic ${epic}${on}, with the role and mods of each phase for every card in it.`
    : `No workflow yet. A short session writes the role and mods of each phase${on}: it reads only this card and the catalogs.`;
  return <p className="text-sm">{text}</p>;
}
