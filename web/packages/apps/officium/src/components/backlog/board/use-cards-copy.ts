"use client";

import { useAuthSession } from "@javadaba/account";
import { useEffect, useMemo, useState } from "react";

import { USES_MEMORY_BACKEND } from "../../../lib/backlog/get-repository";
import { YOU as CURRENT_USER } from "../../../lib/backlog/memory-seed";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { forgetBoardStore, readBoardStore, type BoardStore } from "../../../lib/backlog/local-store/board-store";

/**
 * `waiting`: the account is not known yet (no copy is read for an unknown account).
 * `reading`: IndexedDB has not answered yet. `none`: there is no copy to paint, or the repository
 * keeps none (the in-memory demo). `ready`: `store` holds the last visit's board.
 */
export type CardsCopyState = "waiting" | "reading" | "none" | "ready";

export interface CardsCopy {
  state: CardsCopyState;
  /** Identifies the account and project the copy belongs to: a change of either starts over. */
  key: string;
  /** The account the copy is kept under; null when nothing is kept. */
  accountId: string | null;
  store: BoardStore | null;
}

/**
 * The board's local copy, read once per visit (JAVA-1575), in its own hook so a surface other
 * than the board can read it too (JAVA-1633). Reads only after the account has resolved, and
 * empties the copy when the account signs out.
 */
export function useCardsCopy({ projectId, repository }: { projectId: string | null; repository: BacklogRepository }): CardsCopy {
  const { session, resolved } = useAuthSession();
  const accountId = session?.accountId ?? (USES_MEMORY_BACKEND ? CURRENT_USER.accountId : null);
  // No project yet (a settings page before its project list answers): there is no copy to read.
  const keepsCopy = repository.persistent && projectId !== null;
  const key = `${accountId ?? ""}:${projectId ?? ""}`;
  const [answer, setAnswer] = useState<{ key: string; store: BoardStore | null } | null>(null);

  useEffect(() => {
    if (projectId === null || !keepsCopy || !resolved) return;
    if (!accountId) {
      // Signed out: the copy of the last account goes with it.
      void forgetBoardStore().catch(() => {});
      return;
    }
    let live = true;
    readBoardStore(accountId, projectId).then(
      (store) => live && setAnswer({ key: `${accountId}:${projectId}`, store }),
      () => live && setAnswer({ key: `${accountId}:${projectId}`, store: null }), // Blocked or unavailable: a full load.
    );
    return () => {
      live = false;
    };
  }, [keepsCopy, resolved, accountId, projectId]);

  return useMemo<CardsCopy>(() => {
    const base = { key, accountId: keepsCopy ? accountId : null };
    if (!keepsCopy) return { ...base, state: "none", store: null };
    if (!resolved) return { ...base, state: "waiting", store: null };
    if (!accountId) return { ...base, state: "none", store: null };
    if (answer?.key !== key) return { ...base, state: "reading", store: null };
    return { ...base, state: answer.store ? "ready" : "none", store: answer.store };
  }, [key, keepsCopy, resolved, accountId, answer]);
}
