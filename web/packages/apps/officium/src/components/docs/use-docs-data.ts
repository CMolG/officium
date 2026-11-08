"use client";

import { useCallback, useEffect, useState } from "react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTree, LiveStatus, Project } from "../../lib/backlog/types";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * What the Documentation view reads (JAVA-131): the project, the tree, and the live channel. Every `doc.changed`
 * and every reconnection re-reads the tree (and, through `liveTick`, the open page), so an agent's edit shows
 * without a reload. `refresh` is the same re-read, for a write that can't wait for the channel.
 */
export function useDocsData(projectId: string, repository: BacklogRepository) {
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<DocTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [liveTick, setLiveTick] = useState(0);
  const [live, setLive] = useState<LiveStatus>("live");

  useEffect(() => {
    let cancelled = false;
    repository.getProject(projectId).then(
      (next) => !cancelled && setProject(next),
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  useEffect(() => {
    let cancelled = false;
    repository.getDocTree(projectId).then(
      (next) => {
        if (cancelled) return;
        setTree(next);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt, liveTick]);

  useEffect(
    () =>
      repository.subscribe(
        projectId,
        (event) => {
          if (event.type === "doc.changed" || event.type === "stream.ready") setLiveTick((n) => n + 1);
        },
        setLive,
      ),
    [projectId, repository],
  );

  const refresh = useCallback(() => setLiveTick((n) => n + 1), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { project, tree, setTree, error, retry, liveTick, live, refresh };
}
