"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocListState, DocPageSummary } from "../../lib/backlog/types";
import { DOC_STATE_COPY } from "./doc-state-copy";
import { DocStateList } from "./DocStateList";
import { PurgeDialog } from "./PurgeDialog";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * One of the page lifecycle's lists (JAVA-793): your unpublished drafts, the archive, or the trash.
 * Each has its empty, loading and error states, and the one action that undoes what put a page there.
 * One action runs at a time: the row running it says so, and the others wait.
 */
export function DocStatePanel({
  projectId,
  repository,
  state,
  liveTick,
  canWrite,
  onChanged,
}: {
  projectId: string;
  repository: BacklogRepository;
  state: DocListState;
  liveTick: number;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [pages, setPages] = useState<DocPageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [purging, setPurging] = useState<DocPageSummary | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const copy = DOC_STATE_COPY[state];
  const Icon = copy.icon;

  useEffect(() => {
    let cancelled = false;
    repository.listDocsIn(projectId, state).then(
      (next) => {
        if (cancelled) return;
        setPages(next);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, state, liveTick, attempt]);

  const act = useCallback(
    async (id: string, run: () => Promise<unknown>): Promise<string | null> => {
      setRunning(id);
      try {
        await run();
        setActionError(null);
        setAttempt((n) => n + 1);
        onChanged();
        return null;
      } catch (err) {
        const message = messageOf(err);
        setActionError(message);
        return message;
      } finally {
        setRunning(null);
      }
    },
    [onChanged],
  );

  function actionsFor(page: DocPageSummary) {
    if (!canWrite) return null;
    const busy = running !== null;
    const label = (idle: string, working: string) => (running === page.id ? working : idle);
    if (state === "unpublished") {
      return (
        <Button type="button" register="ui" size="sm" disabled={busy} onClick={() => void act(page.id, () => repository.publishDoc(projectId, page.path))}>
          {label("Publish", "Publishing…")}
        </Button>
      );
    }
    if (state === "archived") {
      return (
        <Button type="button" register="ui" size="sm" variant="outline" disabled={busy} onClick={() => void act(page.id, () => repository.unarchiveDoc(projectId, page.path))}>
          {label("Unarchive", "Unarchiving…")}
        </Button>
      );
    }
    return (
      <>
        <Button type="button" register="ui" size="sm" disabled={busy} onClick={() => void act(page.id, () => repository.restoreDoc(projectId, page.id))}>
          {label("Restore", "Restoring…")}
        </Button>
        <Button type="button" register="ui" size="sm" variant="ghost" disabled={busy} onClick={() => setPurging(page)}>
          Delete forever
        </Button>
      </>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-label={copy.heading} data-testid={`doc-state-${state}`}>
      <header className="flex flex-col gap-1 border-b border-[color:var(--jd-line)] pb-4">
        <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
          <Icon size={20} aria-hidden="true" /> {copy.heading}
        </h2>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">{copy.blurb}</p>
      </header>
      {actionError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {actionError}
        </p>
      )}
      <DocStateList
        projectId={projectId}
        state={state}
        pages={pages}
        error={error}
        onRetry={() => setAttempt((n) => n + 1)}
        actionsFor={actionsFor}
      />
      {purging && (
        <PurgeDialog
          title={purging.title}
          onClose={() => setPurging(null)}
          onConfirm={async () => {
            const problem = await act(purging.id, () => repository.purgeDoc(projectId, purging.id));
            if (!problem) setPurging(null);
            return problem;
          }}
        />
      )}
    </section>
  );
}
