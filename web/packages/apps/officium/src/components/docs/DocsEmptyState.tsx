import type { ReactNode } from "react";
import { FilePlus2, FileStack, FolderPlus } from "lucide-react";
import { Button } from "@javadaba/ui";

/** A project with no page yet: what the documentation is for, and the first step. */
export function DocsEmptyState({
  canWrite,
  onCreatePage,
  onNewCollection,
  children,
}: {
  canWrite: boolean;
  onCreatePage: () => void;
  onNewCollection: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
      <FileStack size={22} className="text-[color:var(--jd-muted)]" aria-hidden="true" />
      <p className="text-base font-semibold">No pages yet</p>
      <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
        Write down how this project works — procedures, decisions, runbooks — in Markdown. People read and
        edit them here; agents read and update them through MCP.
      </p>
      {canWrite ? (
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Button type="button" register="ui" onClick={onCreatePage}>
            <FilePlus2 size={14} aria-hidden="true" /> Create the first page
          </Button>
          <Button type="button" register="ui" variant="outline" onClick={onNewCollection}>
            <FolderPlus size={14} aria-hidden="true" /> New collection
          </Button>
        </div>
      ) : (
        <p className="text-xs text-[color:var(--jd-muted)]">Creating pages needs editor access to this project.</p>
      )}
      {children}
    </div>
  );
}
