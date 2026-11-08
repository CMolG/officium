import type { MenuEntry } from "@javadaba/ui/feedback";
import { FolderInput, Pencil, Trash2 } from "lucide-react";

import type { Folder } from "../../lib/backlog/types";

/** The kind a folder row marks itself with (`menuTarget(FOLDER_MENU_KIND, folder.id)`), and the folder scope answers for. */
export const FOLDER_MENU_KIND = "folder";

export interface FolderMenuActions {
  rename: (folder: Folder) => void;
  move: (folder: Folder) => void;
  remove: (folder: Folder) => void;
}

/** A folder's menu (Off-Home, "Folders that can change"): Rename, Move to… and Delete folder, as data for the feedback layer's one menu. */
export function folderEntries(folder: Folder, act: FolderMenuActions): MenuEntry[] {
  return [
    { id: "rename", label: "Rename", icon: <Pencil size={13} />, onSelect: () => act.rename(folder), testId: "folder-menu-rename" },
    { id: "move", label: "Move to…", icon: <FolderInput size={13} />, onSelect: () => act.move(folder), testId: "folder-menu-move" },
    {
      kind: "group",
      id: "danger",
      entries: [
        {
          id: "delete",
          label: "Delete folder",
          note: "Its projects move up a level",
          icon: <Trash2 size={13} />,
          tone: "danger",
          onSelect: () => act.remove(folder),
          testId: "folder-menu-delete",
        },
      ],
    },
  ];
}
