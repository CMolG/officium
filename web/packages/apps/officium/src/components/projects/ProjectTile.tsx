import { Link } from "@javadaba/ui/navigation";
import { Bot } from "lucide-react";

import { Panel, Text } from "@javadaba/ui";

import type { ProjectGlance } from "../../lib/backlog/home-metrics";
import type { Project } from "../../lib/backlog/types";
import { updatedAgo } from "../../lib/backlog/updated-ago";
import { ProjectIcon } from "./ProjectIcon";
import { ProjectMenuRow } from "./ProjectMenuRow";

/**
 * A project on the projects home (Off-Home, "A dashboard, not a list"): its icon and color, its name as the link,
 * its key and when it last changed; the agents working in it now (counted from the live work list); and, when the
 * API serves the glance, the sprint's progress, what is in progress and in review, and the cards done each day.
 * Without the glance the tile is honest about what it has instead of drawing numbers nobody sent.
 */
export function ProjectTile({
  project,
  working,
  glance,
  now,
}: {
  project: Project;
  /** Cards an agent is working in this project right now. */
  working: number;
  glance?: ProjectGlance;
  now: number;
}) {
  return (
    <ProjectMenuRow projectId={project.id} name={project.name}>
      <Link href={`/app/p/${project.id}`} className="block h-full">
        <Panel material="plain" radius="bento" interactive className="flex h-full flex-col gap-2 p-4 pr-12">
          <ProjectIcon icon={project.icon} color={project.iconColor} size={18} />
          <h3 className="m-0 text-pretty text-base font-semibold">{project.name}</h3>
          <span className="flex flex-row items-center gap-2">
            <span className="font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest text-[color:var(--jd-muted)]">
              {project.keyPrefix}
            </span>
            <Text size="xs" tone="muted">
              Updated {updatedAgo(project.updatedAt, now)}
            </Text>
          </span>
          {glance?.sprintPercent != null && (
            <span className="flex flex-col gap-1">
              <Text size="xs" tone="muted">
                Sprint {glance.sprintPercent}%
              </Text>
              <span
                role="meter"
                aria-label={`Sprint progress of ${project.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={glance.sprintPercent}
                className="block h-1.5 overflow-hidden rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-bone)]"
              >
                <span className="block h-full bg-[color:var(--jd-ink)]/60" style={{ width: `${glance.sprintPercent}%` }} />
              </span>
            </span>
          )}
          <span className="flex flex-row items-center justify-between gap-2">
            <Text size="xs" tone="muted">
              {glance ? `${glance.doing} doing · ${glance.review} review` : ""}
            </Text>
            {working > 0 && (
              <span className="flex flex-row items-center gap-1 text-xs font-semibold text-[color:var(--jd-ink)]">
                <Bot size={12} className="text-[color:var(--officium-agent)]" aria-hidden="true" />
                {working} working
              </span>
            )}
          </span>
        </Panel>
      </Link>
    </ProjectMenuRow>
  );
}
