"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../../lib/backlog/api-error";
import { isConflict } from "../../lib/backlog/types";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPage, Project } from "../../lib/backlog/types";
import { shouldReread } from "../../lib/docs/doc-live";
import { STARTER_BODY, STARTER_TITLE } from "../../lib/system-design/starter";
import { SYSTEM_DESIGN_PATH } from "../../lib/system-design/types";

export type PageState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; page: DocPage };

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * The documentation page the map is drawn from, kept live: an agent's `docs.upsert` (a `doc.changed`
 * for this path) or a reconnection re-reads it, so the map redraws without a reload.
 */
export function useSystemPage(projectId: string, repository: BacklogRepository) {
  const [project, setProject] = useState<Project | null>(null);
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const version = useRef<number | null>(null);

  const read = useCallback(
    () =>
      repository.getDoc(projectId, SYSTEM_DESIGN_PATH).then(
        (page) => {
          version.current = page.version;
          setState({ status: "ready", page });
        },
        (err) => {
          version.current = null;
          setState(err instanceof ApiError && err.code === "doc_not_found" ? { status: "missing" } : { status: "error", message: messageOf(err) });
        },
      ),
    [projectId, repository],
  );

  useEffect(() => {
    let cancelled = false;
    void repository.getProject(projectId).then((p) => !cancelled && setProject(p), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);

  useEffect(() => {
    setState({ status: "loading" });
    void read();
  }, [read, attempt]);

  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (shouldReread(event, SYSTEM_DESIGN_PATH, version.current)) void read();
      }),
    [projectId, repository, read],
  );

  const create = useCallback(async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const result = await repository.upsertDoc(projectId, SYSTEM_DESIGN_PATH, { title: STARTER_TITLE, body: STARTER_BODY });
      if (isConflict(result)) await read();
      else {
        version.current = result.version;
        setState({ status: "ready", page: result });
      }
    } catch (err) {
      setCreateError(messageOf(err));
    } finally {
      setCreating(false);
    }
  }, [projectId, repository, read]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { project, state, retry, create, creating, createError };
}
