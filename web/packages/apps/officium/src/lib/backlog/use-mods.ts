"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@javadaba/account";

import { getBacklogRepository } from "./get-repository";
import { readRecents } from "./last-project";
import type { ModSummary } from "./mod-types";
import { useProjectList } from "./project-list";
import type { BacklogRepository } from "./repository";

/**
 * The project the mods and role sheets are read through (card://JAVA-1569). Mods belong to Fluxor's catalog, not to a
 * project, but the API checks access through one: the last project opened, else the first live one. `undefined` while
 * the list loads, `null` when the person has no project.
 */
export function useCatalogProject(): string | null | undefined {
  const projects = useProjectList();
  const { session } = useAuthSession();
  return useMemo(() => {
    if (projects === null) return undefined;
    const open = projects.filter((p) => p.archivedAt === null);
    if (open.length === 0) return null;
    const recent = readRecents(session?.accountId).find((id) => open.some((p) => p.id === id));
    return (open.find((p) => p.id === recent) ?? open[0]).id;
  }, [projects, session?.accountId]);
}

export type ModCatalog =
  | { state: "loading" }
  | { state: "none" }
  | { state: "error"; message: string; retry: () => void }
  | { state: "ready"; projectId: string; mods: ModSummary[] };

/** One read of the catalog per project and repository, shared by every picker and list that asks. */
const reads = new WeakMap<BacklogRepository, Map<string, Promise<ModSummary[]>>>();

function readMods(repository: BacklogRepository, projectId: string, fresh: boolean): Promise<ModSummary[]> {
  let byProject = reads.get(repository);
  if (!byProject) reads.set(repository, (byProject = new Map()));
  let read = fresh ? undefined : byProject.get(projectId);
  if (!read) {
    read = repository.listMods(projectId);
    byProject.set(projectId, read);
    // A failed read is not kept: the next ask tries again.
    read.catch(() => byProject.get(projectId) === read && byProject.delete(projectId));
  }
  return read;
}

/** The mods of Fluxor's catalog, through `projectId` or, left out, the person's catalog project. */
export function useModCatalog(projectId?: string): ModCatalog {
  const repository = useMemo(() => getBacklogRepository(), []);
  const fallback = useCatalogProject();
  const through = projectId ?? fallback;
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState<{ key: string; result: ModCatalog } | null>(null);
  const key = `${through}:${attempt}`;
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!through) return;
    let cancelled = false;
    readMods(repository, through, attempt > 0).then(
      (mods) => !cancelled && setRead({ key, result: { state: "ready", projectId: through, mods } }),
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
