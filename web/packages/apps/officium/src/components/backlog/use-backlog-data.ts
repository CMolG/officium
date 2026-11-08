"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { boardFace, type BoardCard } from "../../lib/backlog/board-copy";
import { writeBoardEpics } from "../../lib/backlog/local-store/board-store";
import { listAllCards } from "../../lib/backlog/list-all-cards";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Card, ChangeEvent, Project, Sprint } from "../../lib/backlog/types";
import { useOpenCards } from "./board/use-open-cards";

// Rejected too (card://JAVA-1415): a discarded card is neither planned nor carried over. Deploy is
// finished work the board still shows, but the Backlog never lists it (JAVA-1633).
export const isFinished = (status: Card["status"]) => status === "deploy" || status === "done" || status === "rejected";

const NO_EPICS: BoardCard[] = [];

/**
 * What the Backlog shows, read in parts (JAVA-1633): the project and the sprints each set their own
 * state when they answer; the open cards come from the board's copy; the epics, finished ones too
 * (a child's badge names its epic), are one read of `category=epic`, repeated when a catch-up
 * brings an epic card. No closed card is read.
 */
export function useBacklogData(projectId: string, repository: BacklogRepository) {
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[] | null>(null);
  // The epics as last read for this project; until one is, the copy's (a warm visit reads none).
  const [read, setRead] = useState<{ projectId: string; epics: BoardCard[] } | null>(null);
  const [partError, setPartError] = useState<string | null>(null);

  const failed = useCallback((err: unknown) => setPartError(err instanceof Error ? err.message : "Couldn't reach the Officium API."), []);
  const reloadProject = useCallback(
    () => repository.getProject(projectId).then(setProject).catch(failed),
    [projectId, repository, failed],
  );
  const reloadSprints = useCallback(
    () => repository.listSprints(projectId).then(setSprints).catch(failed),
    [projectId, repository, failed],
  );
  // The epics are read after the open cards' hook returns (it needs the account the copy is kept under), so `onChanged` calls them through a ref.
  const reloadEpicsRef = useRef<() => void>(() => {});
  const onChanged = useCallback((changed: BoardCard[]) => {
    if (changed.some((card) => card.category === "epic")) reloadEpicsRef.current();
  }, []);
  const { cards: copied, error: cardsError, catchUp, settled, store, accountId } = useOpenCards({ projectId, repository, onChanged });
  const cards = useMemo(() => copied?.filter((card) => !isFinished(card.status)) ?? null, [copied]);
  const epics = read?.projectId === projectId ? read.epics : (store?.epics ?? NO_EPICS);

  const reloadEpics = useCallback(
    () =>
      listAllCards(repository, projectId, { category: "epic" })
        .then((list) => {
          const faces = list.map(boardFace);
          setRead({ projectId, epics: faces });
          if (accountId) void writeBoardEpics(accountId, projectId, faces).catch(() => {});
        })
        .catch(failed),
    [accountId, projectId, repository, failed],
  );
  useEffect(() => {
    reloadEpicsRef.current = () => void reloadEpics();
  }, [reloadEpics]);

  // The epics a warm visit paints from the copy; a cold one (or an old copy) reads them once (JAVA-1633).
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!settled || seededFor.current === projectId) return;
    seededFor.current = projectId;
    if (!store?.epics) void reloadEpics();
  }, [settled, store, projectId, reloadEpics]);

  useEffect(() => {
    void reloadProject();
    void reloadSprints();
  }, [reloadProject, reloadSprints]);

  useEffect(
    () =>
      repository.subscribe(projectId, (event: ChangeEvent) => {
        if (event.type === "sprint.changed") void reloadSprints();
        else if (event.type === "project.updated") void reloadProject();
        else if (event.type.startsWith("card.") && event.type !== "card.working" && event.type !== "card.queue") void catchUp();
      }),
    [projectId, repository, reloadSprints, reloadProject, catchUp],
  );

  /** After a change of this view's own: the open cards and the sprints, not the project's name. */
  const refresh = useCallback(async () => {
    setPartError(null);
    await Promise.all([catchUp(), reloadSprints()]);
  }, [catchUp, reloadSprints]);

  return { project, sprints, cards, epics, error: partError ?? cardsError, refresh };
}
