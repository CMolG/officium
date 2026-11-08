"use client";

import { useEffect, useRef, useState } from "react";

import type { BacklogRepository } from "../backlog/repository";
import { shouldReread } from "./doc-live";

/**
 * A page's own subscription to the project's live channel (JAVA-802): a counter that moves when this
 * page should re-read. The channel is shared per project, so this opens no connection of its own.
 */
export function useDocPageLive(repository: BacklogRepository, projectId: string, path: string, shownVersion: number | null): number {
  const [tick, setTick] = useState(0);
  const shown = useRef(shownVersion);
  useEffect(() => {
    shown.current = shownVersion;
  }, [shownVersion]);
  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (shouldReread(event, path, shown.current)) setTick((n) => n + 1);
      }),
    [repository, projectId, path],
  );
  return tick;
}
