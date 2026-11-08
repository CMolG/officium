import type { ReactNode } from "react";
import { Button } from "@javadaba/ui";

import type { DocListState, DocPageSummary } from "../../lib/backlog/types";
import { DOC_STATE_COPY } from "./doc-state-copy";
import { DocStateRow } from "./DocStateRow";

/** The body of a lifecycle list: loading, the error with a way out, the empty state, or the rows. */
export function DocStateList({
  projectId,
  state,
  pages,
  error,
  onRetry,
  actionsFor,
}: {
  projectId: string;
  state: DocListState;
  pages: DocPageSummary[] | null;
  error: string | null;
  onRetry: () => void;
  actionsFor: (page: DocPageSummary) => ReactNode;
}) {
  const copy = DOC_STATE_COPY[state];
  if (pages === null) {
    return error ? (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
        <p className="text-sm font-semibold">Couldn&apos;t load the {copy.heading.toLowerCase()}</p>
        <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    ) : (
      <p role="status" className="text-sm text-[color:var(--jd-muted)]">
        Loading…
      </p>
    );
  }
  if (pages.length === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
        <p className="text-base font-semibold">{copy.empty}</p>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">{copy.emptyHint}</p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {pages.map((page) => (
        <DocStateRow key={page.id} projectId={projectId} state={state} page={page} actions={actionsFor(page)} />
      ))}
    </ul>
  );
}
