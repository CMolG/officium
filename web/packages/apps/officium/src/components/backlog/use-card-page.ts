"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { AgentWork, Assignee, CardDetail } from "../../lib/backlog/types";

export type CardPageState =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "error"; message: string }
  | { phase: "ready"; detail: CardDetail; assignees: Assignee[]; agentWork: AgentWork | undefined; readOnly: boolean };

const isMissing = (error: unknown) =>
  (error instanceof ApiError && error.status === 404) || (error instanceof Error && error.message === "card_not_found");

/** Reads a card (the page is keyed by project and card, so a new address starts from `loading`), its project's assignees and the agent working on it (JAVA-1567), for the card's own page. */
export function useCardPage(projectId: string, cardKey: string, repository: BacklogRepository) {
  const [state, setState] = useState<CardPageState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    // The card decides the page; the assignees and the agent are extras that must not hide it.
    Promise.all([
      repository.getCard(projectId, cardKey),
      repository.getProjectMeta(projectId).then((meta) => meta.assignees, () => [] as Assignee[]),
      repository.listWorking(projectId).then((work) => work, () => [] as AgentWork[]),
      // Whether the person only views this project: the page then offers no edit, status change or comment.
      repository.getProject(projectId).then((project) => project.role === "viewer", () => false),
    ]).then(
      ([detail, assignees, working, readOnly]) => {
        if (!stale) setState({ phase: "ready", detail, assignees, agentWork: working.find((w) => w.cardId === detail.id), readOnly });
      },
      (error: unknown) => {
        if (stale) return;
        setState(isMissing(error) ? { phase: "missing" } : { phase: "error", message: error instanceof Error ? error.message : "Something went wrong." });
      },
    );
    return () => {
      stale = true;
    };
  }, [projectId, cardKey, repository, attempt]);

  const retry = useCallback(() => {
    setState({ phase: "loading" });
    setAttempt((n) => n + 1);
  }, []);
  const setDetail = useCallback(
    (detail: CardDetail) => setState((prev) => (prev.phase === "ready" ? { ...prev, detail } : prev)),
    [],
  );
  return { state, retry, setDetail };
}
