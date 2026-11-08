"use client";

import { menuTarget, MoreButton } from "@javadaba/ui/feedback";
import type { ReactNode } from "react";

import { PROJECT_MENU_KIND } from "./project-menu-kind";

/**
 * A project's row or card with its menu: the whole box answers a right-click and a long-press, and
 * the visible button sits in its corner, outside the link so no control nests in another. The
 * content makes room for the button itself.
 */
export function ProjectMenuRow({
  projectId,
  name,
  showButton = true,
  children,
}: {
  projectId: string;
  name: string;
  showButton?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative" {...menuTarget(PROJECT_MENU_KIND, projectId)}>
      {children}
      {showButton && <MoreButton aria-label={`More actions for ${name}`} className="absolute right-0 top-0" />}
    </div>
  );
}
