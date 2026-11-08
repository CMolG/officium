import type { ReactNode } from "react";
import { Link } from "@javadaba/ui/navigation";
import { FileText } from "lucide-react";

import { formatDate } from "../../lib/backlog/format";
import { docsPath } from "../../lib/backlog/search-links";
import type { Actor, DocListState, DocPageSummary } from "../../lib/backlog/types";

const actorName = (actor: Actor) => (actor.kind === "agent" ? (actor.agentName ?? actor.name) : actor.name);

/** What a row says about the page's life, in words: who archived it, or when it leaves the trash. */
function lifeOf(state: DocListState, page: DocPageSummary): string {
  if (state === "archived" && page.archivedAt) {
    return `Archived by ${page.archivedBy ? actorName(page.archivedBy) : "someone"} on ${formatDate(page.archivedAt.slice(0, 10))}`;
  }
  if (state === "trash" && page.deletedAt) {
    return `Deleted by ${page.deletedBy ? actorName(page.deletedBy) : "someone"} on ${formatDate(page.deletedAt.slice(0, 10))}; gone for good on ${formatDate((page.purgeAfter ?? page.deletedAt).slice(0, 10))}`;
  }
  return `Updated ${formatDate(page.updatedAt.slice(0, 10))} by ${actorName(page.updatedBy)}`;
}

/** One page of the unpublished, archive or trash list. A trashed page cannot be opened, so it is a label. */
export function DocStateRow({
  projectId,
  state,
  page,
  actions,
}: {
  projectId: string;
  state: DocListState;
  page: DocPageSummary;
  actions: ReactNode;
}) {
  const title = (
    <span className="flex min-w-0 flex-row items-center gap-2">
      <FileText size={14} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate text-sm font-semibold">{page.title}</span>
    </span>
  );
  return (
    <li
      className="flex flex-col gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3 sm:flex-row sm:items-center"
      data-testid="doc-state-row"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {state === "trash" ? (
          title
        ) : (
          <Link href={docsPath(projectId, page.path)} className="min-w-0 hover:underline">
            {title}
          </Link>
        )}
        <p className="font-mono text-xs text-[color:var(--jd-muted)]">{page.path}</p>
        <p className="text-xs text-[color:var(--jd-muted)]">{lifeOf(state, page)}</p>
      </div>
      <div className="flex shrink-0 flex-row flex-wrap gap-2">{actions}</div>
    </li>
  );
}
