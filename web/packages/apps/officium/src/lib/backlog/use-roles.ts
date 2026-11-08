"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "./get-repository";
import type { RoleSummary } from "./mod-types";
import type { BacklogRepository } from "./repository";
import { useCatalogProject } from "./use-mods";

export type RoleCatalog =
  | { state: "loading" }
  | { state: "none" }
  | { state: "error"; message: string; retry: () => void }
  | { state: "ready"; roles: RoleSummary[] };

/** One read of the catalog's roles per project and repository, shared by every list that asks (card://JAVA-534). */
const reads = new WeakMap<BacklogRepository, Map<string, Promise<RoleSummary[]>>>();

function readRoles(repository: BacklogRepository, projectId: string, fresh: boolean): Promise<RoleSummary[]> {
  let byProject = reads.get(repository);
  if (!byProject) reads.set(repository, (byProject = new Map()));
  let read = fresh ? undefined : byProject.get(projectId);
  if (!read) {
    read = repository.listRoles(projectId);
    byProject.set(projectId, read);
    // A failed read is not kept: the next ask tries again.
    read.catch(() => byProject.get(projectId) === read && byProject.delete(projectId));
  }
  return read;
}

/** The roles of Fluxor's catalog, through the person's catalog project (`none` when they have no project). */
export function useRoleCatalog(): RoleCatalog {
  const repository = useMemo(() => getBacklogRepository(), []);
  const through = useCatalogProject();
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState<{ key: string; result: RoleCatalog } | null>(null);
  const key = `${through}:${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!through) return;
    let cancelled = false;
    readRoles(repository, through, attempt > 0).then(
      (roles) => !cancelled && setRead({ key, result: { state: "ready", roles } }),
      (err: unknown) =>
        !cancelled &&
        setRead({ key, result: { state: "error", message: err instanceof Error ? err.message : "Couldn't reach the Officium API.", retry } }),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, through, attempt, key, retry]);

  if (through === null) return { state: "none" };
  if (!through || read?.key !== key) return { state: "loading" };
  return read.result;
}
