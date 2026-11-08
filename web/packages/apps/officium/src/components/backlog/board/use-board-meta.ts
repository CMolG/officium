"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useCallback, useState } from "react";

import { writeBoardAround } from "../../../lib/backlog/local-store/board-store";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { Assignee, Card, Sprint } from "../../../lib/backlog/types";
import type { CardsCopy } from "./use-cards-copy";

export interface BoardMetaInput {
  projectId: string;
  repository: BacklogRepository;
  copy: CardsCopy;
}

/**
 * What hangs off the cards: the filters' epics, tags and assignees, the "Needs you" lane and the
 * active sprint. Each one is set the moment its own request answers (JAVA-1575); the last visit's
 * copy paints them first.
 */
export function useBoardMeta({ projectId, repository, copy }: BoardMetaInput) {
  const [epics, setEpics] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [needsYou, setNeedsYou] = useState<Card[]>([]);
  // officium-api.md §8.2: while a sprint is active the board shows only ITS cards. The filter is
  // the client's, over the same `cards/changes` read -- a card moving in or out of the sprint
  // changes its `changed_at` like any other column would. `undefined` is "not known yet": the
  // board never shows the whole backlog in the meantime (JAVA-1575).
  const [activeSprint, setActiveSprint] = useState<Sprint | null | undefined>(undefined);

  // The copy paints first, in this render: once the copy has been read (`ready` or `none`, never
  // `waiting` or `reading`), once per account and project, before any request is sent. A copy
  // with no lanes leaves the sprint scope unknown until the network answers.
  const [painted, setPainted] = useState<string | null>(null);
  if ((copy.state === "ready" || copy.state === "none") && painted !== copy.key) {
    setPainted(copy.key);
    const around = copy.store?.around;
    setEpics(around?.projectMeta.epics ?? []);
    setTags(around?.projectMeta.tags ?? []);
    setAssignees(around?.projectMeta.assignees ?? []);
    setNeedsYou(around?.needsYou ?? []);
    setActiveSprint(around ? around.activeSprint : undefined);
  }

  /** What hangs off the cards, each part set as its own request answers; the copy is kept after. */
  const loadAround = useCallback(async () => {
    const [meta, humanCards, active] = await Promise.all([
      repository.getProjectMeta(projectId).then((answer) => {
        setEpics(answer.epics);
        setTags(answer.tags);
        setAssignees(answer.assignees);
        return answer;
      }),
      repository.cardsNeedsHuman(projectId, true).then((answer) => {
        setNeedsYou(answer);
        return answer;
      }),
      repository.listSprints(projectId, "active").then((answer) => {
        const sprint = answer[0] ?? null;
        setActiveSprint(sprint);
        return sprint;
      }),
    ]);
    if (repository.persistent && copy.accountId) {
      const around = { projectMeta: meta, needsYou: humanCards, activeSprint: active };
      void writeBoardAround(copy.accountId, projectId, around).catch(() => {});
    }
  }, [projectId, repository, copy.accountId]);

  return { epics, tags, assignees, needsYou, activeSprint, loadAround };
}

export type BoardMeta = ReturnType<typeof useBoardMeta>;
