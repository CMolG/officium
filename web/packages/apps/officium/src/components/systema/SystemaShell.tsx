"use client";

import type { ReactNode } from "react";
import { usePathname } from "@javadaba/ui/navigation";

import { useCopy } from "../../lib/i18n/use-copy";
import { systemaEntry } from "../../lib/systema/places";
import { SectionShell } from "../shell/SectionShell";
import type { SidebarFrameKeys } from "../shell/SidebarFrame";
import { SystemaNav } from "./SystemaNav";

/** Systema remembers its own fold and width, per viewer, as Configuration does (JAVA-1600). */
const FOLD_KEY = "officium:systema:sidebar-collapsed:v1";
const WIDTH_KEY = "officium:systema:sidebar-width:v1";

/**
 * The Systema frame (JAVA-1600): its own sections beside the page, the layout's ground for every Systema route. Mounted
 * by the `systema` LAYOUT, so moving between its entries keeps the frame, its fold and its scroll. On a phone the
 * entries open in a drawer behind a button.
 */
export function SystemaShell({ projectId, children }: { projectId: string; children: ReactNode }) {
  const copy = useCopy().systema;
  const current = systemaEntry(usePathname() ?? "");
  const frame: SidebarFrameKeys = {
    label: copy.navigation,
    foldKey: FOLD_KEY,
    widthKey: WIDTH_KEY,
    testIds: { frame: "systema-sidebar", tree: "systema-tree", splitter: "systema-sidebar-splitter" },
  };
  const nav = (onNavigate?: () => void) => <SystemaNav projectId={projectId} current={current} onNavigate={onNavigate} copy={copy} />;

  return (
    <SectionShell
      frame={frame}
      drawer={{ title: copy.navigation, closeLabel: copy.closeSections, testId: "systema-drawer" }}
      openLabel={copy.openSections}
      current={current ? copy.entries[current] : copy.title}
      nav={nav}
      shellClass="h-full min-h-0"
      contentClass="min-h-0 flex-1"
    >
      {children}
    </SectionShell>
  );
}
