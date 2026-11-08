"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { useYieldSidebar } from "@javadaba/ui";

import { SidebarDrawer } from "./SidebarDrawer";
import { SidebarFrame, type SidebarFrameKeys } from "./SidebarFrame";
import { WORKSPACE_SIDEBAR_KEY } from "./sidebar-keys";

/** What a section's drawer names for itself: its heading and close label, its test id, and the phone bar's button. */
export type SectionDrawer = { title: string; closeLabel: string; testId: string };

/**
 * The shell of a section that has its own sidebar of pages (JAVA-1626, lifted by JAVA-1600): the frame beside the
 * page on the desktop, a bar and a drawer on a phone. Configuration and Systema each wear it with their own keys and
 * their own nav; the layout that mounts it keeps it mounted while the person moves between its pages.
 */
export function SectionShell({
  frame,
  drawer,
  openLabel,
  current,
  nav,
  shellClass = "",
  contentClass = "",
  children,
}: {
  frame: SidebarFrameKeys;
  drawer: SectionDrawer;
  openLabel: string;
  /** The name of the page on screen, shown after the phone bar's button. */
  current: string;
  nav: (onNavigate?: () => void) => ReactNode;
  /** Extra classes on the outer box: a section whose page is sized by its parent, at every width (JAVA-1600). */
  shellClass?: string;
  contentClass?: string;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // This section has a sidebar of its own: the workspace's folds while it is on screen (JAVA-1768).
  useYieldSidebar(WORKSPACE_SIDEBAR_KEY, frame.foldKey);
  return (
    <div className={`flex flex-col md:h-full md:min-h-0 md:flex-row ${shellClass}`}>
      <SidebarFrame keys={frame}>{nav()}</SidebarFrame>
      <div className={`flex min-w-0 flex-1 flex-col md:min-h-0 md:overflow-y-auto ${contentClass}`}>
        <div className="flex flex-row items-center gap-2 border-b border-[color:var(--jd-line)] px-3 py-1 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls={drawer.testId}
            className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-sm font-medium text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-ink)]/[0.06]"
          >
            <Menu size={16} aria-hidden="true" />
            <span>{openLabel}</span>
            <span className="text-[color:var(--jd-muted)]">{` · ${current}`}</span>
          </button>
        </div>
        {children}
      </div>
      {drawerOpen && (
        <SidebarDrawer title={drawer.title} closeLabel={drawer.closeLabel} testId={drawer.testId} onClose={() => setDrawerOpen(false)}>
          {nav(() => setDrawerOpen(false))}
        </SidebarDrawer>
      )}
    </div>
  );
}
