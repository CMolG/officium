"use client";

import { usePathname, useSearchParams } from "@javadaba/ui/navigation";
import { SidebarCollapseToggle, SidebarRail, useSidebarCollapsed } from "@javadaba/ui";
import { Bolt, LayoutGrid } from "lucide-react";

import { useProjectList } from "../../lib/backlog/project-list";
import { useFolderList } from "../../lib/backlog/folder-list";
import { viewOf } from "./sidebar-views";
import { buildTree } from "./sidebar-tree";
import { ProjectMenuScope } from "../projects/ProjectMenuScope";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { useFoldMotion } from "./use-fold-motion";
import { WORKSPACE_SIDEBAR_KEY } from "./sidebar-keys";
import { SidebarHelp } from "./SidebarHelp";
import { SidebarLink } from "./SidebarLink";
import type { Place } from "./sidebar-place";
import { SidebarBranch } from "./SidebarBranch";

/**
 * The workspace's navigation tree (JAVA-52), redrawn on the shared `SidebarRail` (Off-Shell): All
 * Projects at the root, holding the folders and the projects, each project (its own icon and
 * color) with its views, Help and the workspace's settings at the foot: one Configuration item
 * (JAVA-1626, which holds Organization, the project's settings, Roles and Categories; never
 * reached from inside a card). It is the ONE tree: on the projects home (`/app`) too, where it
 * replaced the home's own folder column -- that column survives only inside the desktop's window,
 * where this sidebar is not mounted (the window has `ProjectRail` instead).
 *
 * A folder is a link that shows its projects on the home, plus a disclosure for what it holds. A
 * project is a disclosure for its views -- except while another project's view is open: then its
 * row switches project and keeps the view, which is the question someone on project A's Backlog
 * is asking when they reach for project B.
 *
 * From `md` up it folds to an icon rail (JAVA-117): every entry keeps its name (`aria-label`) and a
 * tooltip, the current view stays marked, and the project in view keeps its view icons. The
 * phone's drawer never folds -- it is opened to be read, and closes on its own.
 */
export function WorkspaceSidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = /^\/app\/p\/([^/]+)/.exec(pathname)?.[1];
  // The project in view: its live channel keeps the list current while an agent edits it (JAVA-125).
  const projects = useProjectList(projectId);
  const folders = useFolderList();
  const { collapsed } = useSidebarCollapsed(WORKSPACE_SIDEBAR_KEY);
  const folded = useFoldMotion(collapsed);
  const rail = folded && !mobileOpen;

  const place: Place = {
    pathname,
    projectId,
    view: projectId ? viewOf(pathname, projectId) : null,
    homeFolderId: pathname === "/app" ? searchParams.get("folder") : undefined,
    rail,
    onNavigate: onCloseMobile,
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          // The drawer is modal on a phone: its scrim and the drawer sit on the dialog layer, above
          // the consent banner, so nothing is left clickable underneath (overlay-layer.test.mjs).
          className="fixed inset-0 z-[100] animate-jd-fade-in bg-[color:var(--jd-scrim)] md:hidden"
        />
      )}
      {/* On a phone it comes out of the left edge it is anchored to (motion job 2); the travel is
          zeroed under reduced motion, leaving the fade. It reaches the screen's bottom edge, drawer
          and rail alike, so it keeps the home indicator's inset clear below Configuration; the
          drawer, fixed to the left edge, also keeps clear of a landscape notch (JAVA-222). */}
      <div
        className={`${mobileOpen ? "z-[101]" : "z-40"} shrink-0 flex-col border-r border-[color:var(--jd-line)] bg-[color:var(--jd-page)] pb-[env(safe-area-inset-bottom)] ${
          mobileOpen ? "fixed inset-y-0 left-0 flex pl-[env(safe-area-inset-left)] max-md:animate-jd-slide-in-left" : "hidden md:flex"
        }`}
      >
        <SidebarRail label="Workspace" folded={rail} className={`min-h-0 flex-1 rounded-none ${rail ? "" : "w-64"}`}>
          {/* The tree scrolls on its own; Configuration and the fold button stay pinned below it, so
              a long list of projects never pushes them out of reach (layout floor L1/rule 6: one
              height-bounded scroll container). */}
          <div data-testid="workspace-tree" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            <SidebarLink
              href="/app"
              label="All Projects"
              icon={LayoutGrid}
              current={place.homeFolderId === null}
              rail={rail}
              onNavigate={onCloseMobile}
            />
            {projects === null || folders === null ? (
              <p className={rail ? "sr-only" : "px-3 py-2 text-xs text-[color:var(--jd-muted)]"}>Loading…</p>
            ) : (
              <ProjectMenuScope projects={projects} repository={getBacklogRepository()} label="Projects" onExport={onCloseMobile}>
                <SidebarBranch parentId={null} tree={buildTree(folders, projects)} place={place} />
              </ProjectMenuScope>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-0.5 border-t border-[color:var(--jd-line)] pt-2">
            {/* The tour lights the board itself: a card's page reads as the board for the tree, but has none of its parts. */}
            <SidebarHelp onBoard={projectId !== undefined && pathname === `/app/p/${projectId}`} rail={rail} />
            <SidebarLink
              href="/app/configuration/organization"
              label="Configuration"
              icon={Bolt}
              current={pathname.startsWith("/app/configuration")}
              rail={rail}
              onNavigate={onCloseMobile}
            />
            {!mobileOpen && (
              <SidebarCollapseToggle
                storageKey={WORKSPACE_SIDEBAR_KEY}
                folded={folded}
                iconSize={15}
                className={`flex flex-row min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-jd-control)] px-2 py-1.5 text-sm text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)] ${
                  rail ? "justify-center" : ""
                }`}
              />
            )}
          </div>
        </SidebarRail>
      </div>
    </>
  );
}
