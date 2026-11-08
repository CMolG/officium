"use client";

import { useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { ChevronRight } from "lucide-react";

import type { Project } from "../../lib/backlog/types";
import { usePendingChangelogCount } from "../../lib/docs/changelog-count";
import { ProjectIcon } from "../projects/ProjectIcon";
import { ProjectMenuRow } from "../projects/ProjectMenuRow";
import { SidebarChildren } from "./SidebarChildren";
import { SidebarLink } from "./SidebarLink";
import { disclosureKeys, type Place } from "./sidebar-place";
import { VIEWS } from "./sidebar-views";

/**
 * A project of the workspace tree: a disclosure for its views -- except while another project's view is
 * open: then its row switches project and keeps that view, which is the question someone on project A's
 * Backlog is asking when they reach for project B.
 */
export function SidebarProjectNode({ project, place }: { project: Project; place: Place }) {
  const isCurrent = place.projectId === project.id;
  const [expanded, setExpanded] = useState(isCurrent);
  // Becoming the project in view opens it; it can still be closed by hand afterwards.
  const [wasCurrent, setWasCurrent] = useState(isCurrent);
  if (wasCurrent !== isCurrent) {
    setWasCurrent(isCurrent);
    if (isCurrent) setExpanded(true);
  }
  const views = VIEWS.map((v) => ({ ...v, path: v.href(project.id) }));
  // Only the project in view asks: one request for the entry someone is looking at (JAVA-132).
  const pendingChanges = usePendingChangelogCount(isCurrent ? project.id : undefined);

  const rowClass = `flex flex-row min-h-11 w-full items-center gap-2 rounded-[var(--radius-jd-control)] px-2 py-1.5 text-left text-sm font-medium text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-ink)]/[0.06] ${
    place.rail ? "justify-center" : "pr-11"
  }`;
  const label = (
    <>
      <ProjectIcon icon={project.icon} color={project.iconColor} size={15} className="shrink-0" />
      <span className={place.rail ? "sr-only" : "min-w-0 flex-1 truncate"}>{project.name}</span>
    </>
  );

  // Another project's view is open: this row switches project and keeps that view.
  const switchTo = place.view && !isCurrent ? views.find((v) => v.id === place.view) : undefined;
  if (switchTo) {
    return (
      <ProjectMenuRow projectId={project.id} name={project.name} showButton={!place.rail}>
        <Link href={switchTo.path} onClick={place.onNavigate} title={place.rail ? project.name : undefined} className={rowClass}>
          {/* The disclosure's chevron, unseen: the name lines up with the other rows'. */}
          {!place.rail && <ChevronRight size={13} className="invisible shrink-0" aria-hidden="true" />}
          {label}
        </Link>
      </ProjectMenuRow>
    );
  }

  return (
    <div>
      <ProjectMenuRow projectId={project.id} name={project.name} showButton={!place.rail}>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={disclosureKeys(expanded, setExpanded)}
          title={place.rail ? project.name : undefined}
          className={rowClass}
        >
          {!place.rail && (
            <ChevronRight size={13} className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
          )}
          {label}
        </button>
      </ProjectMenuRow>
      {expanded && (
        <SidebarChildren rail={place.rail}>
          {views.map((view) => (
            <SidebarLink
              key={view.id}
              href={view.path}
              label={view.label}
              icon={view.icon}
              badge={view.id === "docs" && pendingChanges ? `${pendingChanges} pending` : view.badge}
              badgeTone={view.badge ? "info" : "neutral"}
              current={isCurrent && place.view === view.id}
              rail={place.rail}
              onNavigate={place.onNavigate}
            />
          ))}
        </SidebarChildren>
      )}
    </div>
  );
}
