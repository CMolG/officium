import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/*
 * SidebarRail -- the box a product's side navigation lives in (Lib-Chrome, "Sidebar fold"): a page
 * colored panel with 12 px of room, entries stacked 2 px apart, and the fold control last. Unfolded
 * it is 240 px; folded it is a 64 px rail of 44 px icon targets (`NavItem folded`). Which of the two
 * is drawn, and whether it is remembered, is the caller's (`useSidebarCollapsed`).
 *
 * A section can also take the sidebar over: its own title, its own entries, and a way back at the top
 * (`SidebarBack`, "All sections").
 */

export interface SidebarRailProps {
  /** The nav's accessible name: "Project". The folded rail's name says so too: "Project, folded". */
  label: string;
  folded?: boolean;
  children: ReactNode;
  className?: string;
}

export function SidebarRail({ label, folded = false, children, className }: SidebarRailProps) {
  return (
    <nav
      aria-label={folded ? `${label}, folded` : label}
      data-jd-component="SidebarRail"
      data-folded={folded ? "" : undefined}
      className={cn(
        "flex flex-col gap-0.5 rounded-2xl bg-[color:var(--jd-page)]",
        folded ? "w-16 items-center px-2 py-3" : "w-60 p-3",
        className,
      )}
    >
      {children}
    </nav>
  );
}
