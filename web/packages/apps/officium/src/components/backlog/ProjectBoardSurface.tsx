"use client";

import { useEffect, useMemo } from "react";
import { useAuthSession } from "@javadaba/account";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { recordProjectOpened } from "../../lib/backlog/last-project";
import { useAutoBoardTour } from "../../lib/shell/board-tour";
import { Board } from "./Board";

/**
 * Thin client wrapper around a single project's `Board`. `key={projectId}` at the call site
 * (this component) forces a full remount when the project changes -- filters, sort, view mode
 * and scroll are `Board`'s own `useState`, so without the key React would keep that state across
 * a `projectId` prop change instead of resetting it (JDB-225: "switching projects resets filters
 * to that project's own").
 *
 * It is also where "Your first board" opens (Off-Tour): once, the first time a board is on screen
 * with cards in it, never over a dialog or a typed field. The host that draws it lives in the shell.
 */
export function ProjectBoardSurface({ projectId }: { projectId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const { session } = useAuthSession();
  useAutoBoardTour();

  useEffect(() => {
    recordProjectOpened(projectId, session?.accountId);
  }, [projectId, session?.accountId]);

  return <Board key={projectId} projectId={projectId} repository={repository} />;
}
