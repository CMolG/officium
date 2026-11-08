"use client";

import { Button } from "@javadaba/ui";

import { setProjectNotice, useProjectNotice } from "../../lib/backlog/project-notice";

/**
 * The sentence left behind by something done to a project elsewhere (JAVA-1554: "X was deleted").
 * In flow under the header, a live region mounted empty so the change is announced; it stays
 * until dismissed.
 */
export function ProjectNotice() {
  const message = useProjectNotice();
  return (
    <div role="status" aria-live="polite" data-testid="project-notice">
      {message && (
        <div className="flex flex-row flex-wrap items-center gap-3 border-b border-[color:var(--jd-line)] bg-[color:var(--jd-ink)]/[0.04] px-4 py-2 text-sm sm:px-6">
          <p className="min-w-0 flex-1 text-pretty">{message}</p>
          <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 shrink-0" onClick={() => setProjectNotice(null)}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
