"use client";

import { useEffect, useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { readRoleMatrix } from "../../../lib/backlog/role-matrix-cache";
import type { RunCell } from "../../../lib/backlog/role-matrix-types";

/** The model and effort the workflow session runs on: loading, failed, or the project's refine cell. */
export type WorkflowRun = { state: "loading" } | { state: "error" } | { state: "ready"; run: RunCell | null };

/**
 * Reads `runs.workflow.refine` of the project's matrix (JAVA-1591), with a retry for a failed read. Each read is keyed by
 * its attempt, so a result for an earlier attempt never answers a later one, and a read in flight reads as loading.
 */
export function useWorkflowRun(repository: BacklogRepository, projectId: string): { run: WorkflowRun; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; run: WorkflowRun } | null>(null);
  const key = `${projectId}:${attempt}`;

  useEffect(() => {
    let live = true;
    readRoleMatrix(repository, projectId).then(
      (view) => live && setSettled({ key, run: { state: "ready", run: view.effective.runs?.workflow?.refine ?? null } }),
      () => live && setSettled({ key, run: { state: "error" } }),
    );
    return () => {
      live = false;
    };
  }, [repository, projectId, key]);

  const run: WorkflowRun = settled?.key === key ? settled.run : { state: "loading" };
  return { run, retry: () => setAttempt((n) => n + 1) };
}
