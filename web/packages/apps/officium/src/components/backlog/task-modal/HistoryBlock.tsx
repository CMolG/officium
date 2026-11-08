"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import type { CardDetail } from "../../../lib/backlog/types";
import { formatDate } from "../../../lib/backlog/format";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import { ActorName } from "../CommentThreads";
import { usePrecedenceHistory } from "./use-precedence-history";

export function HistoryBlock({ detail, repository }: { detail: CardDetail; repository: BacklogRepository }) {
  const ruleLines = usePrecedenceHistory(repository, detail.projectId, detail.id);
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">History</h3>
      <ul className="flex flex-col gap-3 border-l-2 border-[color:var(--jd-line)] py-1 pl-3 text-xs">
        <li>
          <span className="block font-semibold">Created</span>
          <span className="flex flex-row items-center gap-1 font-medium text-[color:var(--jd-muted)]">
            {formatDate(detail.createdAt.slice(0, 10))} · <ActorName actor={detail.createdBy} />
          </span>
        </li>
        <li>
          <span className="block font-semibold">Last updated</span>
          <span className="flex flex-row items-center gap-1 font-medium text-[color:var(--jd-muted)]">
            {formatDate(detail.updatedAt.slice(0, 10))} · <ActorName actor={detail.updatedBy} />
          </span>
        </li>
        {ruleLines.map((entry) => (
          <li key={entry.id} data-testid="precedence-history">
            <span className="block font-semibold">{entry.summary}</span>
            <span className="flex flex-row items-center gap-1 font-medium text-[color:var(--jd-muted)]">
              {formatDate(entry.at.slice(0, 10))}
            </span>
          </li>
        ))}
        {detail.humanEditedAt && detail.humanEditedBy && (
          <li data-testid="human-edit">
            <span className="block font-semibold">Changed by a person</span>
            <span className="flex flex-row flex-wrap items-center gap-1 font-medium text-[color:var(--jd-muted)]">
              {formatDate(detail.humanEditedAt.slice(0, 10))} · {detail.humanEditedBy.name}
            </span>
            <span className="mt-0.5 block text-[color:var(--jd-muted)]">
              {detail.humanEditPending
                ? "No agent has reviewed it yet."
                : `Reviewed by an agent${detail.humanEditReviewedAt ? ` on ${formatDate(detail.humanEditReviewedAt.slice(0, 10))}` : ""}.`}
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
