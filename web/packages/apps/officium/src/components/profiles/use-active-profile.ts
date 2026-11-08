"use client";

import { useCallback, useEffect, useState } from "react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { getProfilesClient } from "../../lib/profiles/profiles-client";
import type { ProfilesView } from "../../lib/profiles/profile-types";

export const DEFAULTS = "__defaults__";

/**
 * The work profiles of a project and whether the person may switch them, read together and read again when the
 * matrix changes elsewhere (JAVA-1627). The role comes with the project read, the same one `ProjectCells` re-reads on
 * `project.roleMatrix`, so the card and the matrix below it never disagree about who owns the project.
 */
export function useActiveProfile(projectId: string, readFailed: string) {
  const client = getProfilesClient();
  const [view, setView] = useState<ProfilesView | null>(null);
  const [owner, setOwner] = useState(false);
  const [choice, setChoice] = useState(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [profiles, project] = await Promise.all([client.list(projectId), getBacklogRepository().getProject(projectId)]);
      setView(profiles);
      setOwner(project.role === "owner");
      setChoice(profiles.profiles.find((p) => p.active)?.id ?? DEFAULTS);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : readFailed);
    }
  }, [client, readFailed, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () =>
      getBacklogRepository().subscribe(projectId, (event) => {
        if (event.type === "project.roleMatrix" || event.type === "stream.ready") void load();
      }),
    [load, projectId],
  );

  return { client, view, setView, owner, choice, setChoice, error, setError, load };
}
