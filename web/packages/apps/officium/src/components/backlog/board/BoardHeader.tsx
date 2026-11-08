"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { Link } from "@javadaba/ui/navigation";
import { ArrowLeft, Eye, Users } from "lucide-react";

import { Badge, Button, Text } from "@javadaba/ui";

import type { Project } from "../../../lib/backlog/types";
import { useFramed } from "../../../lib/shell/frame-context";
import { ProjectBadgeSelect } from "../../projects/ProjectBadgeSelect";
import { ProjectLabel } from "../../projects/ProjectLabel";
import { AutoloopControlButton } from "./AutoloopControlButton";

export interface BoardHeaderProps {
  inTheater: boolean;
  project: Project | null;
  projectId: string;
  /** The active sprint's name, said beside the title inside a window ("Sprint 12"). */
  sprintName?: string;
  setEditProjectOpen: (open: boolean) => void;
  setMembersOpen: (open: boolean) => void;
}

/** The viewer's one line (Off-Shell, "Viewers are told"): what they are, and what to ask for. */
const VIEW_ONLY_HELP = "You can view this project. Ask its owner for editor access to change cards.";

/**
 * The strip above the board (Off-Shell, Off-Board). Opened as a page: Projects, the project's badge (its
 * switcher) and, for a viewer, "View only". Inside a desktop window the window's navigation row carries
 * the first two, so the strip says where you are instead ("Task Board", the sprint). On both: the
 * autoloop's Start/Stop, Edit project and Members. A viewer's Edit project is off and the line under the
 * strip says why, instead of failing with a generic error later.
 */
export function BoardHeader({ inTheater, project, projectId, sprintName, setEditProjectOpen, setMembersOpen }: BoardHeaderProps) {
  const framed = useFramed();
  const viewer = project?.role === "viewer";
  const owner = project?.role === "owner";
  return (
    <div className="flex shrink-0 flex-col gap-1.5 border-b border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] px-4 py-3 sm:px-6">
      <div className="flex flex-row flex-wrap items-center gap-3">
        {framed && !inTheater ? (
          <span className="flex flex-row items-baseline gap-3">
            <Text type="ui" weight="semibold">
              Task Board
            </Text>
            {sprintName && (
              <Text size="sm" tone="muted">
                {sprintName}
              </Text>
            )}
          </span>
        ) : (
          <>
            {!inTheater && (
              <>
                <Button asChild register="ui" variant="ghost" size="sm" className="shrink-0">
                  <Link href="/app">
                    <ArrowLeft size={14} aria-hidden="true" /> Projects
                  </Link>
                </Button>
              </>
            )}
            {/* The current project as its badge: one control that also switches project (it replaces the label
                and the separate switcher). The Theater scene has no other project to offer, so it keeps the plain
                label. */}
            {inTheater ? <ProjectLabel project={project} /> : <ProjectBadgeSelect projectId={projectId} project={project} />}
          </>
        )}
        {viewer && (
          <Badge register="chip" tone="neutral" fill="subtle" size="md">
            <Eye size={14} aria-hidden="true" />
            View only
          </Badge>
        )}
        {/* card://JAVA-1528: the autoloop's switch, left of Members; it carries the strip's ml-auto. A Theater scene has
            no API to ask and no loop to start, so it shows none. */}
        {!inTheater && <AutoloopControlButton canWrite={project !== null && !viewer} />}
        {project && !inTheater && (
          <Button
            type="button"
            register="ui"
            variant="outline"
            size="sm"
            disabled={!owner}
            aria-describedby={viewer ? "board-view-only" : undefined}
            title={!owner && !viewer ? "Only the project owner can change its name, icon and color" : undefined}
            onClick={() => setEditProjectOpen(true)}
            className="min-h-11 shrink-0 sm:min-h-8"
          >
            Edit project
          </Button>
        )}
        {/* On a phone the word folds away (the name stays for assistive tech): with it, the
            button wrapped onto a line of its own under the project's name. */}
        <Button type="button" register="ui" variant="outline" size="sm" className={`${inTheater ? "ml-auto " : ""}min-h-11 shrink-0 sm:min-h-8`} onClick={() => setMembersOpen(true)}>
          <Users size={14} aria-hidden="true" /> <span className="max-sm:sr-only">Members</span>
        </Button>
      </div>
      {viewer && (
        <p id="board-view-only" className="m-0 text-sm text-[color:var(--jd-muted)]">
          {VIEW_ONLY_HELP}
        </p>
      )}
    </div>
  );
}
