"use client";

import { useEffect, useState } from "react";

import { boardFace, type BoardCard } from "../../../lib/backlog/board-copy";
import { elsewhereQueries } from "../../../lib/backlog/elsewhere-query";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { BoardFilters } from "./use-board-filters";

export type ElsewhereMatches =
  | { state: "idle" }
  | { state: "looking" }
  | { state: "found"; backlog: BoardCard[]; completed: BoardCard[] };

/** Lets a person finish typing before the two reads go out. */
const SETTLE_MS = 250;

/**
 * The cards the board's filters match outside the board (JAVA-2046), read while the component that
 * shows "nothing matches" is mounted. A filter change starts a new read and drops the old answer; a
 * failed read counts as nothing found, so the board says "No cards match" as it did before.
 */
export function useElsewhereMatches({ repository, projectId, filters }: { repository: BacklogRepository; projectId: string; filters: BoardFilters }): ElsewhereMatches {
  const { filtering, liftKey, matches, searchTerm, activePriorities, epicFilter, tagFilter, executorFilter, categoryFilter, blockedOnly } = filters;
  const key = filtering ? `${projectId}|${liftKey}` : "";
  const [found, setFound] = useState<{ key: string; backlog: BoardCard[]; completed: BoardCard[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const { backlog, completed } = elsewhereQueries({ searchTerm, activePriorities, epicFilter, tagFilter, executorFilter, categoryFilter, blockedOnly });
    const timer = setTimeout(() => {
      Promise.all([repository.listCards(projectId, backlog), repository.listCards(projectId, completed)])
        .then(([inBacklog, done]) => {
          if (cancelled) return;
          setFound({ key, backlog: inBacklog.items.map(boardFace).filter(matches), completed: done.items.map(boardFace).filter(matches) });
        })
        .catch(() => {
          if (!cancelled) setFound({ key, backlog: [], completed: [] });
        });
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, repository, projectId, matches, searchTerm, activePriorities, epicFilter, tagFilter, executorFilter, categoryFilter, blockedOnly]);

  if (!key) return { state: "idle" };
  if (!found || found.key !== key) return { state: "looking" };
  return { state: "found", backlog: found.backlog, completed: found.completed };
}
