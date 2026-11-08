import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthSession } from "@javadaba/account";

import { ApiError } from "../../lib/backlog/api-error";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { readRecents } from "../../lib/backlog/last-project";
import { refreshProjectList, useProjectList } from "../../lib/backlog/project-list";
import { readRoleMatrix } from "../../lib/backlog/role-matrix-cache";
import { DEFAULT_ROLE_MATRIX } from "../../lib/backlog/role-config";
import type { Project, RoleMatrix } from "../../lib/backlog/types";

export type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error"; message: string };

function errorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return "This project doesn't exist, or you're not one of its members.";
  return err instanceof Error ? err.message : "Couldn't reach the Officium API.";
}

/**
 * The matrix "Who works it" is read against: the last-opened project's, else the default when
 * there is no project. A retry sends focus to the section's heading before its button unmounts
 * into a skeleton (WCAG 2.4.3).
 */
export function useCategoryMatrix() {
  const repository = useMemo(() => getBacklogRepository(), []);
  const projects = useProjectList();
  const { session } = useAuthSession();
  const accountId = session?.accountId;
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const [read, setRead] = useState<{ key: string; load: Load<RoleMatrix> } | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const open = useMemo(() => projects?.filter((p) => p.archivedAt === null) ?? null, [projects]);
  const project: Project | null = useMemo(() => {
    if (!open || open.length === 0) return null;
    const recent = readRecents(accountId).find((pid) => open.some((p) => p.id === pid));
    return open.find((p) => p.id === recent) ?? open[0];
  }, [open, accountId]);
  const projectId = project?.id ?? null;

  // The shared list swallows a failed first load into an empty one: asking here tells "no
  // projects" (the default applies) from "couldn't read them".
  useEffect(() => {
    let cancelled = false;
    refreshProjectList(repository).then(
      () => !cancelled && setListError(null),
      (err: unknown) => !cancelled && setListError(err instanceof Error ? err.message : "Couldn't reach the Officium API."),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, attempt]);

  const key = `${projectId}:${attempt}`;
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const readKey = `${projectId}:${attempt}`;
    readRoleMatrix(repository, projectId).then(
      (view) => !cancelled && setRead({ key: readKey, load: { state: "ready", value: view.effective } }),
      (err: unknown) => !cancelled && setRead({ key: readKey, load: { state: "error", message: errorText(err) } }),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  const matrix: Load<RoleMatrix> =
    open === null
      ? { state: "loading" }
      : open.length === 0
        ? listError
          ? { state: "error", message: `Your projects couldn't be read: ${listError}` }
          : { state: "ready", value: DEFAULT_ROLE_MATRIX }
        : read?.key === key
          ? read.load
          : { state: "loading" };

  return {
    matrix,
    project,
    heading,
    retry: () => {
      heading.current?.focus();
      setAttempt((n) => n + 1);
    },
  };
}
