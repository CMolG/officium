import type { MenuEntry } from "@javadaba/ui/feedback";
import { Archive, Download, Pencil, Trash2, Users } from "lucide-react";

import type { Project } from "../../lib/backlog/types";

// The project menu's rows, as data: the app's menu and the Theater scene draw them from here, so the
// scene can never show an entry the app does not have (JAVA-1656).

export const OWNER_ONLY_EDIT = "Only the project's owner can change its name, icon and color";
export const OWNER_ONLY_ARCHIVE = "Only the project's owner can archive it";
export const OWNER_ONLY_DELETE = "Only the project's owner can delete it";
export const PROTECTED_DELETE = "This project is protected: it can never be deleted and its owner never changes";
export const DEMO_EXPORT = "The demo keeps nothing to export: sign in to export your backlog";

export const EXPORT_PREPARING = "Preparing the backlog export…";

export interface ProjectMenuActions {
  edit: (p: Project) => void;
  members: (p: Project) => void;
  export: (p: Project) => void;
  archive: (p: Project) => void;
  remove: (p: Project) => void;
}

export function projectEntries(project: Project, act: ProjectMenuActions, exportable: boolean): MenuEntry[] {
  const owner = project.role === "owner";
  return [
    {
      id: "edit",
      label: "Edit project",
      icon: <Pencil size={13} />,
      disabledReason: owner ? undefined : OWNER_ONLY_EDIT,
      onSelect: () => act.edit(project),
      testId: "project-menu-edit",
    },
    { id: "members", label: "Members", icon: <Users size={13} />, onSelect: () => act.members(project), testId: "project-menu-members" },
    {
      id: "export",
      label: "Export backlog",
      note: "One Markdown file per card, as a .zip",
      icon: <Download size={13} />,
      disabledReason: exportable ? undefined : DEMO_EXPORT,
      onSelect: () => act.export(project),
      testId: "project-menu-export",
    },
    {
      id: "archive",
      label: "Archive project",
      note: "Out of the way, nothing deleted",
      icon: <Archive size={13} />,
      disabledReason: owner ? undefined : OWNER_ONLY_ARCHIVE,
      onSelect: () => act.archive(project),
      testId: "project-menu-archive",
    },
    {
      kind: "group",
      id: "danger",
      entries: [
        {
          id: "delete",
          label: "Delete project",
          icon: <Trash2 size={13} />,
          tone: "danger",
          disabledReason: project.protected ? PROTECTED_DELETE : owner ? undefined : OWNER_ONLY_DELETE,
          onSelect: () => act.remove(project),
          testId: "project-menu-delete",
        },
      ],
    },
  ];
}
