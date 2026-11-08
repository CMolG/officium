"use client";

import { useMemo } from "react";
import { usePathname } from "@javadaba/ui/navigation";
import { useYieldSidebar } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { docPathOf } from "../../lib/backlog/search-links";
import { PageCommandsProvider } from "../../lib/docs/page-commands";
import { DocStarsProvider } from "../../lib/docs/use-doc-stars";
import { WORKSPACE_SIDEBAR_KEY } from "../shell/sidebar-keys";
import { DocsView } from "./DocsView";
import { DOCS_SIDEBAR_KEY } from "./docs-sidebar-keys";

/**
 * The documentation view with what several of its parts share (JAVA-799): the caller's stars, read once for the
 * sidebar, a page's Star button and a tree row's menu, and the open page's actions, which the command menu runs.
 *
 * Mounted by the `docs` LAYOUT, not by the page (JAVA-1536): Next keeps a layout across navigation between its
 * child pages, so the tree, the sidebar's scroll and its folds stay while only the open page changes. The page's
 * path is read from the address for the same reason.
 */
export function DocsWorkspace({ projectId }: { projectId: string }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const path = docPathOf(usePathname() ?? "", projectId);
  // Documentation has its own sidebar: the workspace's folds while the documentation is on screen (JAVA-1768).
  useYieldSidebar(WORKSPACE_SIDEBAR_KEY, DOCS_SIDEBAR_KEY);
  return (
    <DocStarsProvider projectId={projectId} repository={repository}>
      <PageCommandsProvider>
        <DocsView projectId={projectId} path={path} />
      </PageCommandsProvider>
    </DocStarsProvider>
  );
}
