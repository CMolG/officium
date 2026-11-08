"use client";

import { useCallback } from "react";
import { useUndoNotice, type UndoNoticeController } from "@javadaba/ui";
import { useRouter } from "@javadaba/ui/navigation";

import { docsPath } from "../backlog/search-links";
import type { BacklogRepository } from "../backlog/repository";

interface DeletedDoc {
  id: string;
  title: string;
  path: string;
}

/**
 * Deleting a page needs no dialog (JAVA-793): it goes to the trash, and the view offers Undo, which
 * restores it by id and goes back to where it was. No timer: the notice stays until dismissed. The view
 * stays mounted while the address changes (JAVA-1536), so the notice outlives both moves on its own.
 */
export function useDocDeleteUndo(
  projectId: string,
  repository: BacklogRepository,
  refresh: () => void,
): { undo: UndoNoticeController; onDeleted: (deleted: DeletedDoc) => void } {
  const router = useRouter();
  const undo = useUndoNotice();
  const { offer } = undo;

  const onDeleted = useCallback(
    (deleted: DeletedDoc) => {
      offer({
        message: `“${deleted.title}” moved to the trash.`,
        undone: `“${deleted.title}” is back at ${deleted.path}.`,
        undo: async () => {
          await repository.restoreDoc(projectId, deleted.id);
          refresh();
          router.replace(docsPath(projectId, deleted.path));
        },
      });
      router.replace(docsPath(projectId));
    },
    [offer, repository, projectId, refresh, router],
  );

  return { undo, onDeleted };
}
