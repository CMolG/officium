import type { ReactNode } from "react";
import { Link } from "@javadaba/ui/navigation";
import { ArrowLeft } from "lucide-react";

import type { Project } from "../../lib/backlog/types";
import { ProjectBadgeSelect } from "../projects/ProjectBadgeSelect";

/**
 * The Backlog's title row, drawn in every state of the page (loading, failed and ready), so a broken project still
 * has the badge to leave it by. `children` are the row's actions, on the ready page only.
 */
export function BacklogTitleRow({ projectId, project, children }: { projectId: string; project: Project | null; children?: ReactNode }) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-3">
      <Link href={`/app/p/${projectId}`} className="flex min-h-11 flex-row items-center gap-1 text-sm font-medium text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]">
        <ArrowLeft size={14} aria-hidden="true" /> Board
      </Link>
      <span className="h-4 w-px bg-[color:var(--jd-line)]" aria-hidden="true" />
      <h1 className="text-lg font-bold">Backlog</h1>
      <ProjectBadgeSelect projectId={projectId} project={project} />
      {children}
    </div>
  );
}
