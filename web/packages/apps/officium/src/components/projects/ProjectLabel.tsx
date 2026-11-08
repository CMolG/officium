import { Text } from "@javadaba/ui";

import type { Project } from "../../lib/backlog/types";
import { ProjectIcon } from "./ProjectIcon";

/**
 * The project as a label, not a control: the badge's look with nothing to choose from. Its test id is the one the
 * e2e specs read the project by.
 */
export function ProjectLabel({ project }: { project: Project | null }) {
  return (
    <p
      data-testid="project-label"
      className="flex h-8 min-w-0 max-w-full flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-3 text-xs font-medium text-[color:var(--jd-ink)]"
    >
      {project && <ProjectIcon icon={project.icon} color={project.iconColor} size={14} className="shrink-0" />}
      <Text as="span" className="truncate">{project?.name ?? ""}</Text>
    </p>
  );
}
