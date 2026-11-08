"use client";

import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import { useUnsavedDrafts } from "../../lib/docs/unsaved-drafts";

/**
 * The pages left with changes that could not be saved (JAVA-796), each named with the way back.
 * Opening one restores its changes and saves them; the open page's own draft is never listed.
 */
export function UnsavedDraftsNotice({ projectId, current }: { projectId: string; current: string | null }) {
  const drafts = useUnsavedDrafts(projectId).filter((draft) => draft.path !== current);
  if (!drafts.length) return null;
  return (
    <ul aria-label="Unsaved changes" className="mb-3 flex flex-col gap-1" data-testid="unsaved-drafts">
      {drafts.map((draft) => (
        <li key={draft.path} role="status" className="flex flex-row flex-wrap items-center gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] px-3 py-2 text-sm">
          <span>Changes to “{draft.title || draft.path}” aren&apos;t saved yet</span>
          <Link href={docsPath(projectId, draft.path)} className="font-medium underline underline-offset-2">
            Open it
          </Link>
        </li>
      ))}
    </ul>
  );
}
