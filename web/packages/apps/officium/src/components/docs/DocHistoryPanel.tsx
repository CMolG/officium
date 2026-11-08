"use client";

import { History, X } from "lucide-react";
import { Button, Note, Text, UndoNotice } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";
import { configurationPath } from "../../lib/configuration/places";
import { saveFile } from "@javadaba/sdk/platform";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPage, DocRevision } from "../../lib/backlog/types";
import { DocRevisionRow } from "./DocRevisionRow";
import { useDocHistory } from "./use-doc-history";

const downloadName = (path: string, version: number) => `${path.split("/").pop()}-v${version}.md`;

/**
 * The versions kept of one page (JAVA-794): the heaviest ever, which never expires, and the two
 * latest previous ones, which do after the project's window. Restoring writes a NEW version, so
 * it is offered with an Undo rather than a confirmation; deleting a version is final, so it asks
 * for the page's title to be typed.
 */
export function DocHistoryPanel({
  projectId,
  path,
  repository,
  canWrite,
  page,
  onRestored,
  onClose,
}: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  canWrite: boolean;
  page: DocPage;
  /** After a restore or an undo: the page as it is now. */
  onRestored: (page: DocPage) => void;
  /** It opens in the page's side column (JAVA-1537), and closes from its own header too. */
  onClose: () => void;
}) {
  const { history, error, busy, actionError, retry, restore, remove, confirmDialog, undo } = useDocHistory({
    projectId,
    path,
    repository,
    page,
    onRestored,
  });

  const download = (revision: DocRevision) =>
    void saveFile(new Blob([revision.body], { type: "text/markdown" }), downloadName(path, revision.version));

  return (
    <section aria-label="Page history" className="flex flex-col gap-4" data-testid="doc-history">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-row items-center gap-1.5 text-lg font-bold">
          <History size={16} aria-hidden="true" /> <Text>History</Text>
        </h3>
        <div className="flex flex-row items-center gap-1">
          <Link href={configurationPath("documentation", projectId)} className="flex min-h-11 flex-row items-center text-sm font-medium underline underline-offset-2">
            <Text>History settings</Text>
          </Link>
          <Button type="button" register="ui" size="icon" variant="ghost" className="size-11" aria-label="Close history" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-raised)] p-4 shadow-[inset_0_0_0_1px_var(--jd-line)]" data-testid="history-current">
        <Text className="text-sm font-semibold">{`Current · version ${page.version}`}</Text>
      </div>

      {error && !history && (
        <Note tone="danger" role="alert" className="items-start">
          <div className="flex flex-col items-start gap-2">
            <Text className="text-sm font-semibold">Couldn&apos;t load the history</Text>
            <Text className="text-sm">{error}</Text>
            <Button type="button" register="ui" variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        </Note>
      )}
      {!history && !error && (
        <Text role="status" className="text-sm text-[color:var(--jd-muted)]">
          Loading the history…
        </Text>
      )}
      {history && history.revisions.length === 0 && (
        <p className="text-sm text-[color:var(--jd-muted)]" data-testid="history-empty">
          {history.historyDays === 0
            ? "Nothing is kept: history is set to 0 days, so only the heaviest version of a page would be."
            : `No earlier versions yet. When this page changes, its previous version is kept for ${history.historyDays} days, along with the heaviest one ever.`}
        </p>
      )}
      {history && history.revisions.length > 0 && (
        <ol className="flex flex-col gap-3">
          {history.revisions.map((revision) => (
            <DocRevisionRow
              key={revision.id}
              revision={revision}
              currentBody={page.body}
              canWrite={canWrite}
              busy={busy}
              onRestore={() => void restore(revision)}
              onDownload={() => download(revision)}
              onDelete={() => void remove(revision)}
            />
          ))}
        </ol>
      )}
      {actionError && (
        <Text role="alert" className="text-sm font-medium text-destructive">
          {actionError}
        </Text>
      )}
      <UndoNotice controller={undo} />
      {confirmDialog}
    </section>
  );
}
