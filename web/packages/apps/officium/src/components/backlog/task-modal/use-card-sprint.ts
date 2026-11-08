"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useEffect, useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { CardDetail, Sprint } from "../../../lib/backlog/types";

/** The sprint a card is planned in, read-only. */
export function useCardSprint({ projectId, repository, detail }: { projectId: string; repository: BacklogRepository; detail: CardDetail }) {
  // The sprint field (JAVA-197) is read-only, so a fetch of every sprint is enough -- no need to
  // thread the list through whichever parent opened this modal (Board only knows the ACTIVE
  // sprint; BacklogView already fetched the full list for its own sections, but a card can be
  // opened from either, or from search, so fetching here is the one path that works from all of
  // them).
  const [sprints, setSprints] = useState<Sprint[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void repository.listSprints(projectId).then((list) => {
      if (!cancelled) setSprints(list);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);
  const sprint = detail.sprintId ? (sprints?.find((s) => s.id === detail.sprintId) ?? null) : null;
  return { sprints, sprint };
}
