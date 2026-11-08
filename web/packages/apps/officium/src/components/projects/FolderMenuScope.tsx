"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useConfirmDialog } from "@javadaba/ui";
import { FeedbackMenuScope, type MenuProviders } from "@javadaba/ui/feedback";

import { refreshFolderList } from "../../lib/backlog/folder-list";
import { refreshProjectList } from "../../lib/backlog/project-list";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Folder, Project } from "../../lib/backlog/types";
import { FOLDER_MENU_KIND, folderEntries } from "./folder-menu-entries";
import { MoveFolderDialog } from "./MoveFolderDialog";

/**
 * The menu of a folder row (Off-Home, "Folders that can change"): Rename, Move to… and Delete folder, on the
 * same feedback-layer menu as the projects' (right-click, long press, the menu key and the visible More actions).
 * Deleting a folder keeps what it holds: its folders and projects move up a level first, then it goes.
 */
export function FolderMenuScope({
  folders,
  projects,
  repository,
  onChanged,
  children,
}: {
  folders: readonly Folder[];
  projects: readonly Project[];
  repository: BacklogRepository;
  /** Runs after any change, with the folder that was deleted (so a view of it can step out). */
  onChanged: (deleted?: Folder) => void;
  children: ReactNode;
}) {
  const confirm = useConfirmDialog();
  const [moving, setMoving] = useState<Folder | null>(null);

  const changed = useCallback(
    async (deleted?: Folder) => {
      await Promise.all([refreshFolderList(), refreshProjectList()]);
      onChanged(deleted);
    },
    [onChanged],
  );

  const failed = useCallback(
    (title: string, err: unknown) =>
      confirm.alert({
        title,
        description: err instanceof Error ? err.message : "Couldn't reach the Officium API.",
        confirmLabel: "OK",
      }),
    [confirm],
  );

  const rename = useCallback(
    async (folder: Folder) => {
      const name = await confirm.prompt({
        title: `Rename ${folder.name}`,
        label: "Name",
        defaultValue: folder.name,
        confirmLabel: "Rename",
        cancelLabel: "Cancel",
      });
      if (name === null || !name.trim() || name.trim() === folder.name) return;
      try {
        await repository.updateFolder(folder.id, { name: name.trim() });
        await changed();
      } catch (err) {
        await failed(`Couldn't rename ${folder.name}`, err);
      }
    },
    [changed, confirm, failed, repository],
  );

  const move = useCallback(
    async (folder: Folder, parentId: string | null) => {
      setMoving(null);
      try {
        await repository.updateFolder(folder.id, { parentId });
        await changed();
      } catch (err) {
        await failed(`Couldn't move ${folder.name}`, err);
      }
    },
    [changed, failed, repository],
  );

  const remove = useCallback(
    async (folder: Folder) => {
      const ok = await confirm.confirm({
        title: `Delete ${folder.name}?`,
        description: "Deleting a folder keeps its projects; they move up a level.",
        confirmLabel: "Delete folder",
        cancelLabel: "Keep it",
        destructive: true,
      });
      if (!ok) return;
      try {
        // The repository refuses a folder that still holds anything (`folder_not_empty`), so what it holds goes up first.
        for (const child of folders.filter((f) => f.parentId === folder.id)) {
          await repository.updateFolder(child.id, { parentId: folder.parentId });
        }
        for (const project of projects.filter((p) => p.folderId === folder.id)) {
          await repository.updateProject(project.id, { expectedVersion: project.version, folderId: folder.parentId });
        }
        await repository.deleteFolder(folder.id);
        await changed(folder);
      } catch (err) {
        await failed(`Couldn't delete ${folder.name}`, err);
        await changed();
      }
    },
    [changed, confirm, failed, folders, projects, repository],
  );

  const providers = useMemo<MenuProviders>(
    () => ({
      [FOLDER_MENU_KIND]: (ctx) => {
        const folder = folders.find((f) => f.id === ctx.targetId);
        return folder ? folderEntries(folder, { rename: (f) => void rename(f), move: setMoving, remove: (f) => void remove(f) }) : [];
      },
    }),
    [folders, rename, remove],
  );

  return (
    <FeedbackMenuScope providers={providers} label="Folders">
      {children}
      {moving && (
        <MoveFolderDialog
          folder={moving}
          folders={folders}
          onClose={() => setMoving(null)}
          onMove={(parentId) => void move(moving, parentId)}
        />
      )}
      {confirm.dialog}
    </FeedbackMenuScope>
  );
}
