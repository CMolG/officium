"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirmDialog, useUndoNotice } from "@javadaba/ui";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type DocHistory, type DocPage, type DocRevision } from "../../lib/backlog/types";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** Loads a page's kept versions and does what the history panel offers on them: restore (with an Undo) and delete (typed title). */
export function useDocHistory({
  projectId,
  path,
  repository,
  page,
  onRestored,
}: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  page: DocPage;
  onRestored: (page: DocPage) => void;
}) {
  const [history, setHistory] = useState<DocHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const undo = useUndoNotice();
  const confirm = useConfirmDialog();

  const load = useCallback(() => {
    setError(null);
    repository.getDocHistory(projectId, path).then(setHistory, (err) => setError(messageOf(err)));
  }, [projectId, path, repository]);

  useEffect(load, [load, attempt, page.version]);

  async function restore(revision: DocRevision) {
    setBusy(true);
    setActionError(null);
    try {
      const result = await repository.restoreDocRevision(projectId, path, revision.id, page.version);
      if (isConflict(result)) {
        onRestored(result.current);
        setActionError("Someone saved this page while you were looking. The history shows it as it is now: choose again.");
        return;
      }
      onRestored(result);
      const replaced = result.revisionId;
      if (replaced) {
        undo.offer({
          message: `Version ${revision.version} is now version ${result.version}.`,
          undone: `Back to the version you replaced, now version ${result.version + 1}.`,
          undo: async () => {
            const back = await repository.restoreDocRevision(projectId, path, replaced, result.version);
            if (isConflict(back)) throw new Error("The page changed since, so it stays as it is.");
            onRestored(back);
          },
        });
      } else {
        setActionError(
          result.historyKept === false
            ? "Restored. The version it replaced wasn't kept because the owner's storage is full, so this can't be undone."
            : "Restored. The version it replaced wasn't kept under this project's history window, so this can't be undone. The owner can change the window in the docs settings.",
        );
      }
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(revision: DocRevision) {
    const typed = await confirm.prompt({
      title: `Delete version ${revision.version} for good?`,
      description: "It can't be restored afterwards, even if it is the heaviest version. Type the page's title to confirm.",
      label: "Page title",
      placeholder: page.title,
      mustMatch: page.title,
      confirmLabel: "Delete version",
      cancelLabel: "Cancel",
    });
    if (typed === null) return;
    setBusy(true);
    setActionError(null);
    try {
      await repository.deleteDocRevision(projectId, path, revision.id, typed);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError && err.code === "doc_revision_not_found" ? "That version is already gone." : messageOf(err));
      load();
    } finally {
      setBusy(false);
    }
  }

  return { history, error, busy, actionError, retry: () => setAttempt((n) => n + 1), restore, remove, confirmDialog: confirm.dialog, undo };
}
