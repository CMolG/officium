import { BetweenHorizontalStart, BookSearch, FileChartPie, FileStack, LayoutDashboard, Network } from "lucide-react";

import { backlogPath, contributionsPath, docsPath, searchPath } from "../../lib/backlog/search-links";
import { CONFIGURATION_ROOT, configurationPath, configurationPlace } from "../../lib/configuration/places";
import { systemaRoot } from "../../lib/systema/places";

export type ViewId = "board" | "search" | "backlog" | "contributions" | "docs" | "systema";

export interface View {
  id: ViewId;
  label: string;
  icon: typeof LayoutDashboard;
  href: (projectId: string) => string;
  /** A short word shown in the row, so a feature still being tried says so. */
  badge?: string;
}

// A project's views, in the tree's order. Systema (JAVA-1600, its System design entry from JAVA-58) is experimental: its row says so.
export const VIEWS: readonly View[] = [
  { id: "board", label: "Task Board", icon: LayoutDashboard, href: (id) => `/app/p/${id}` },
  { id: "search", label: "Search Tasks", icon: BookSearch, href: (id) => searchPath(id) },
  { id: "backlog", label: "Backlog", icon: BetweenHorizontalStart, href: backlogPath },
  { id: "contributions", label: "Contributions", icon: FileChartPie, href: contributionsPath },
  { id: "docs", label: "Documentation", icon: FileStack, href: (id) => docsPath(id) },
  { id: "systema", label: "Systema", icon: Network, href: systemaRoot, badge: "Experimental" },
];

/** The view a project path is on. `/report` is the time report folded into Contributions. */
export function viewOf(pathname: string, projectId: string): ViewId {
  const segment = pathname.slice(`/app/p/${projectId}`.length).split("/")[1] ?? "";
  if (segment === "report") return "contributions";
  return VIEWS.find((v) => v.id === segment)?.id ?? "board";
}

/**
 * The address of the same place in another project: a Configuration page keeps its section, any other page keeps its
 * view (a card page reads as the board). Used by the project badge, so a switch stays where the person was.
 */
export function projectSwitchPath(pathname: string, fromId: string, toId: string): string {
  if (pathname === CONFIGURATION_ROOT || pathname.startsWith(`${CONFIGURATION_ROOT}/`)) {
    return configurationPath(configurationPlace(pathname).section ?? "organization", toId);
  }
  const view = VIEWS.find((v) => v.id === viewOf(pathname, fromId)) ?? VIEWS[0];
  return view.href(toId);
}
