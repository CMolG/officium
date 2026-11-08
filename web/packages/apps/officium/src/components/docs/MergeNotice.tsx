import { Button, Note } from "@javadaba/ui";

import type { MergeNotice as Notice } from "./use-outside-merge";

/**
 * What a merge from outside the room leaves in every editor (JAVA-1477): who wrote, said in words
 * (a status, so screen readers announce it), and where lines overlapped, that their version is in History.
 */
export function MergeNotice({ notice, onOpenHistory, onDismiss }: {
  notice: Notice;
  /** Absent when History is already open or the page keeps none. */
  onOpenHistory?: () => void;
  onDismiss: () => void;
}) {
  return (
    <Note tone="info" role="status" data-testid="doc-merge-notice">
      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 basis-64">
          Merged: {notice.by} saved a change to this page.
          {notice.overlaps > 0 && " Where you both changed the same lines, your text stays and their version is kept in History."}
        </span>
        {notice.overlaps > 0 && onOpenHistory && (
          <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:min-h-0" onClick={onOpenHistory}>
            Open History
          </Button>
        )}
        <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:min-h-0" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </Note>
  );
}
