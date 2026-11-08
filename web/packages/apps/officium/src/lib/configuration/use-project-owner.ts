"use client";

import { useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "../backlog/get-repository";
import type { Project } from "../backlog/types";
import { messageOf } from "./project-api";

/** The project a Configuration page edits and whether the person owns it: owners write, everyone else reads. */
export function useProjectOwner(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository.getProject(projectId).then(
      (value) => !cancelled && setProject(value),
      (err: unknown) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);

  return { project, isOwner: project?.role === "owner", error };
}
