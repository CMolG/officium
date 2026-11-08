"use client";

import { useEffect, useMemo, useState } from "react";

import { ApiError } from "../../lib/backlog/api-error";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { GithubRepositories, Project } from "../../lib/backlog/types";

export type GithubLoad =
  | { state: "loading" }
  | { state: "ready"; value: GithubRepositories }
  | { state: "error"; message: string; ownerOnly: boolean };

export function errorText(err: unknown): string {
  if (err instanceof ApiError && err.code === "github_repository_taken") {
    return "Another project already gets this repository's activity. Its owner disconnects it there first.";
  }
  if (err instanceof ApiError && err.code === "github_repository_not_installed") {
    return "GitHub hasn't said you reach this repository in the last day. Authorize with GitHub again, then connect it.";
  }
  return err instanceof Error ? err.message : "Couldn't reach the Officium API.";
}

/**
 * The project's GitHub repositories, read once and shared by every section of Integrations that shows them
 * (JAVA-1663): connecting or disconnecting one replaces this read in place, so the sections never disagree.
 */
export function useGithubRepositories(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [read, setRead] = useState<{ attempt: number; load: GithubLoad } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repository.getProject(projectId).then(
      (p) => !cancelled && setProject(p),
      () => {},
    );
    void repository.getGithubRepositories(projectId).then(
      (value) => !cancelled && setRead({ attempt, load: { state: "ready", value } }),
      (err: unknown) =>
        !cancelled &&
        setRead({
          attempt,
          load: {
            state: "error",
            message: errorText(err),
            ownerOnly: err instanceof ApiError && err.code === "owner_only",
          },
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  const load: GithubLoad = read?.attempt === attempt ? read.load : { state: "loading" };

  async function change(repo: string, connect: boolean) {
    setBusy(repo);
    setActionError(null);
    try {
      const value = connect
        ? await repository.connectGithubRepository(projectId, repo)
        : await repository.disconnectGithubRepository(projectId, repo);
      setRead({ attempt, load: { state: "ready", value } });
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  return { project, load, busy, actionError, change, retry: () => setAttempt((n) => n + 1) };
}

export type GithubRepositoriesState = ReturnType<typeof useGithubRepositories>;
