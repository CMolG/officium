"use client";

import { useState } from "react";
import { Button, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";
import { configurationPath } from "../../lib/configuration/places";

import { docsPath } from "../../lib/backlog/search-links";
import type { SkippedFile } from "../../lib/docs/markdown-files";

export interface ImportedPage {
  path: string;
  title: string;
  version: number;
}

/** Where a drop is: writing, written (with what was skipped and, past the allowance, what was left), or undone. */
export type ImportState =
  | { kind: "running"; count: number }
  | { kind: "done"; imported: ImportedPage[]; skipped: SkippedFile[]; left: string[] }
  | { kind: "undone"; removed: number; kept: string[] };

const pages = (n: number) => `${n} ${n === 1 ? "page" : "pages"}`;

/**
 * What a Markdown import says (JAVA-801), in flow under the header: while it writes, what it added (each a link)
 * with Undo, every file it skipped and why, and, when the owner's storage ran out, which files it never wrote.
 * Undo moves the added pages to the trash; a page someone edited since is kept, and the notice says which.
 */
export function DocImportNotice({
  projectId,
  state,
  onUndo,
  onDismiss,
}: {
  projectId: string;
  state: ImportState;
  onUndo: () => Promise<void>;
  onDismiss: () => void;
}) {
  const [undoing, setUndoing] = useState(false);
  return (
    <div
      role="status"
      data-testid="doc-import-notice"
      className="flex flex-col gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] px-3 py-2 text-sm"
    >
      {state.kind === "running" && <p>Importing {state.count === 1 ? "1 file" : `${state.count} files`}…</p>}
      {state.kind === "done" && (
        <>
          <p className="font-medium">{state.imported.length === 0 ? "No page was added." : `Added ${pages(state.imported.length)}:`}</p>
          {state.imported.length > 0 && (
            <ul className="flex flex-row flex-wrap gap-x-4 gap-y-1">
              {state.imported.map((page) => (
                <li key={page.path} className="flex flex-row">
                  <Link href={docsPath(projectId, page.path)} className="flex min-h-11 flex-row items-center underline underline-offset-2">
                    <Text>{page.title}</Text>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {state.left.length > 0 && (
            <p data-testid="doc-import-quota">
              The owner&apos;s storage is full, so the import stopped. Not imported: {state.left.join(", ")}.{" "}
              <Link href={configurationPath("documentation", projectId)} className="font-medium underline underline-offset-2">
                See what takes the space
              </Link>
            </p>
          )}
          {state.skipped.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-[color:var(--jd-muted)]" aria-label="Skipped files">
              {state.skipped.map((file) => (
                <li key={file.file} className="flex flex-row">
                  <Text>
                    Skipped {file.file}: {file.reason}.
                  </Text>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {state.kind === "undone" && (
        <p>
          {state.removed > 0 ? `Moved the ${pages(state.removed)} you imported to the trash.` : "Nothing was moved to the trash."}
          {state.kept.length > 0 && ` Kept ${state.kept.join(", ")}: edited since the import.`}
        </p>
      )}
      {state.kind !== "running" && (
        <div className="flex flex-row flex-wrap gap-2">
          {state.kind === "done" && state.imported.length > 0 && (
            <Button
              type="button"
              register="ui"
              size="sm"
              variant="outline"
              disabled={undoing}
              onClick={async () => {
                setUndoing(true);
                await onUndo();
                setUndoing(false);
              }}
            >
              {undoing ? "Undoing…" : "Undo"}
            </Button>
          )}
          <Button type="button" register="ui" size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
