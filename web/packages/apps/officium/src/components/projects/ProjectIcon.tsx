import { projectColorVar, projectIconComponent } from "../../lib/backlog/project-appearance";
import type { ProjectColor } from "../../lib/backlog/types";

/**
 * A project's icon, in its own color (JAVA-51). The single place that draws one, so the sidebar,
 * the projects home grid and the board's project label never fall out of sync with each other.
 */
export function ProjectIcon({
  icon,
  color,
  size = 16,
  className,
}: {
  icon: string;
  color: ProjectColor;
  size?: number;
  className?: string;
}) {
  const Icon = projectIconComponent(icon);
  return (
    <Icon
      size={size}
      aria-hidden="true"
      className={className}
      style={{ color: projectColorVar(color) }}
    />
  );
}
