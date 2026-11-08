"use client";

import { useCallback, useEffect, useState } from "react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTemplate } from "../../lib/backlog/types";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** The project's templates (JAVA-801), read again on every `liveTick`. `templates` is null until the first answer. */
export function useDocTemplates(projectId: string, repository: BacklogRepository, liveTick = 0) {
  const [templates, setTemplates] = useState<DocTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repository.listDocTemplates(projectId).then(
      (next) => {
        if (cancelled) return;
        setTemplates(next);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, liveTick, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { templates, error, retry };
}
