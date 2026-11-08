import { Archive, Trash2 } from "lucide-react";
import { Button } from "@javadaba/ui";

import type { DocPage } from "../../lib/backlog/types";

/**
 * What an editor can do to a page (JAVA-793); its text and its title are edited in place (JAVA-796), so
 * there is no Edit button and no Rename (JAVA-1537): typing on the title renames the page, and Page
 * options → Move to… moves it. An archived page can't be edited or moved until it is unarchived, an
 * unpublished draft can't be archived (publish or delete it), and a template can't either (JAVA-801).
 * Delete asks nothing: the page goes to the trash and the view offers Undo. While Archive or Delete is
 * in flight both wait, and the one running says so.
 */
export function DocPageActions({
  page,
  pending,
  onArchive,
  onDelete,
}: {
  page: DocPage;
  pending: "archive" | "delete" | null;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const archived = page.archivedAt !== null;
  const busy = pending !== null;
  return (
    <div className="flex flex-row flex-wrap gap-2">
      {!archived && page.publishedAt !== null && !page.template && (
        <Button type="button" register="ui" size="sm" variant="outline" disabled={busy} onClick={onArchive}>
          <Archive size={14} aria-hidden="true" /> {pending === "archive" ? "Archiving…" : "Archive"}
        </Button>
      )}
      <Button type="button" register="ui" size="sm" variant="ghost" disabled={busy} onClick={onDelete}>
        <Trash2 size={14} aria-hidden="true" /> {pending === "delete" ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
