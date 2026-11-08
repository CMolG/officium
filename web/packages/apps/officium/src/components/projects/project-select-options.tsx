import type { SelectOption } from "@javadaba/ui";

import type { Project } from "../../lib/backlog/types";
import { ProjectIcon } from "./ProjectIcon";

/**
 * The options of every project selector: the project's icon, then its name. One mapping, so the header badge and the
 * Configuration selector identify a project the same way.
 */
export function projectOptions(projects: Project[]): SelectOption[] {
  return projects.map((p) => ({
    value: p.id,
    label: p.name,
    prefix: <ProjectIcon icon={p.icon} color={p.iconColor} size={14} className="shrink-0" />,
  }));
}
