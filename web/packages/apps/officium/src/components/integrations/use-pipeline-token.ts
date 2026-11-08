"use client";

import { useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { ChangelogTokenStatus } from "../../lib/backlog/types";

type TokenRead = { state: "loading" } | { state: "ready"; value: ChangelogTokenStatus } | { state: "error"; message: string };

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * The project's pipeline token (JAVA-132, officium-api.md §8.8), for the Documentation changelog section of
 * Integrations (JAVA-1663). The plain token is kept only in `issued`, for the one view that shows it: a new
 * one replaces it, and a revoke clears it. Anyone may read the status; only the owner may change it.
 */
export function usePipelineToken(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [read, setRead] = useState<{ attempt: number; value: TokenRead } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [issued, setIssued] = useState<string | null>(null);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repository.getChangelogToken(projectId).then(
      (value) => !cancelled && setRead({ attempt, value: { state: "ready", value } }),
      (err: unknown) => !cancelled && setRead({ attempt, value: { state: "error", message: messageOf(err) } }),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  const status: TokenRead = read?.attempt === attempt ? read.value : { state: "loading" };

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const result = await repository.issueChangelogToken(projectId);
      setIssued(result.token);
      setRead({ attempt, value: { state: "ready", value: { configured: true, createdBy: null, createdAt: result.createdAt } } });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    try {
      await repository.revokeChangelogToken(projectId);
      setIssued(null);
      setConfirmingRevoke(false);
      setRead({ attempt, value: { state: "ready", value: { configured: false, createdBy: null, createdAt: null } } });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    status,
    issued,
    busy,
    error,
    confirmingRevoke,
    setConfirmingRevoke,
    issue,
    revoke,
    retry: () => setAttempt((n) => n + 1),
  };
}

export type PipelineToken = ReturnType<typeof usePipelineToken>;
