"use client";

import { useEffect, useState } from "react";

import type { CardActivity } from "../../../lib/backlog/precedence-repository";
import type { BacklogRepository } from "../../../lib/backlog/repository";

/** The lines a precedence rule wrote on the card (JAVA-1686); a failed read shows none. */
export function usePrecedenceHistory(repository: BacklogRepository, projectId: string, cardId: string): CardActivity[] {
  const [entries, setEntries] = useState<CardActivity[]>([]);
  useEffect(() => {
    let live = true;
    repository
      .listCardPrecedenceActivity(projectId, cardId)
      .then((found) => live && setEntries(found))
      .catch(() => live && setEntries([]));
    return () => {
      live = false;
    };
  }, [repository, projectId, cardId]);
  return entries;
}
