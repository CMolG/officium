"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { FramedMenu, type MenuContext, type MenuPoint } from "@javadaba/ui/feedback";

import type { Project } from "../../lib/backlog/types";
import { PROJECT_MENU_KIND } from "../projects/project-menu-kind";
import { projectEntries } from "../projects/project-menu-entries";
import { WORK_RULES_TOKEN_QUOTA } from "../../lib/work-rules/tokens";

// The scene's own project, for the menu's entries. Its id only keys the menu's context; nothing is
// read from it or written to it.
const SAMPLE_PROJECT: Project = {
  id: "sample-storefront",
  folderId: null,
  name: "Storefront",
  keyPrefix: "OFF",
  role: "owner",
  icon: "folder-kanban",
  iconColor: "blue",
  archivedAt: null,
  formLanguages: [],
  version: 1,
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-20T09:00:00Z",
  definitionOfDone: [],
  definitionOfDoneTokenQuota: WORK_RULES_TOKEN_QUOTA,
  protected: false,
};

/**
 * The project's "More" menu, hosted by the scene: the page's own menu would open on `body`, outside
 * the scaled frame, so the scene opens the feedback layer's `FramedMenu` inside its layer. Only the
 * export row is kept: the others would be dead controls on a marketing page.
 */
export function ExportMenu({ onExport, children }: { onExport: () => void; children: ReactNode }) {
  const entries = useMemo(
    () =>
      projectEntries(
        SAMPLE_PROJECT,
        { edit: () => undefined, members: () => undefined, export: onExport, archive: () => undefined, remove: () => undefined },
        true,
      ).filter((entry) => entry.kind !== "group" && entry.id === "export"),
    [onExport],
  );

  const menuFor = useCallback(
    (target: Element, point: MenuPoint) => {
      const ctx: MenuContext = { targetKind: PROJECT_MENU_KIND, targetId: SAMPLE_PROJECT.id, point, worldPos: null, target };
      return { entries, ctx };
    },
    [entries],
  );

  return (
    <FramedMenu frame=".theater__layer" menuFor={menuFor} aria-label="Project menu">
      {children}
    </FramedMenu>
  );
}
