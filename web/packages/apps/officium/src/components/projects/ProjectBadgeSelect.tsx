"use client";

import { useEffect, useRef, useState } from "react";

import { useAuthSession } from "@javadaba/account";
import { LoadingRegion, Select, Skeleton } from "@javadaba/ui";
import { usePathname, useRouter } from "@javadaba/ui/navigation";

import { badgeProjects, projectBadgeState } from "../../lib/backlog/project-badge";
import { badgeFocusPending, expectBadgeFocus } from "../../lib/backlog/project-badge-focus";
import { recordProjectOpened } from "../../lib/backlog/last-project";
import { useProjectList } from "../../lib/backlog/project-list";
import type { Project } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import { projectSwitchPath } from "../shell/sidebar-views";
import { ProjectBadgeRetry } from "./ProjectBadgeRetry";
import { ProjectLabel } from "./ProjectLabel";
import { projectOptions } from "./project-select-options";

// The badge's look: the Board label's fill and radius, made into a control. It reads as a badge, not a form field.
const BADGE =
  "min-h-11 sm:min-h-8 max-w-full min-w-0 rounded-[var(--radius-jd-sm)] border-transparent hover:border-transparent " +
  "bg-[color:var(--jd-ink)]/[0.06] hover:bg-[color:var(--jd-ink)]/10 text-[color:var(--jd-ink)] hover:text-[color:var(--jd-ink)] " +
  "focus-visible:outline-[color:var(--jd-ink)] transition-[color,background-color,scale] duration-[var(--jd-dur-fast)] " +
  "motion-safe:active:scale-[0.98] active:duration-[var(--jd-dur-instant)]";

/**
 * The project badge: the project a section is in, as a control in its title row. Choosing another project keeps the
 * person on the same section of it, and remembers the pick. One component for every section that names a project.
 */
export function ProjectBadgeSelect({ projectId, project = null }: { projectId: string; project?: Project | null }) {
  const copy = useCopy().configuration;
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { session } = useAuthSession();
  const list = useProjectList();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [pick, setPick] = useState<{ from: string; to: string } | null>(null);
  const [loadedNote, setLoadedNote] = useState("");

  const current = project ?? list?.find((p) => p.id === projectId) ?? null;
  const state = projectBadgeState(list, current);
  const options = badgeProjects(list ?? [], current);
  // The pick shows at once, but only for the address it was made from: a navigation that lands elsewhere drops it.
  const shownId = pick?.from === projectId ? pick.to : projectId;
  const shownName = options.find((p) => p.id === shownId)?.name ?? current?.name ?? "";

  // The page of a project the person just switched to takes focus, since a route change remounts it. It waits for the
  // control itself: the badge usually mounts as a skeleton, and a hand-off taken then would find no button.
  useEffect(() => {
    if (state === "switchable" && badgeFocusPending(projectId)) wrapperRef.current?.querySelector("button")?.focus();
  }, [state, projectId]);

  const choose = (id: string) => {
    if (id === projectId) return;
    recordProjectOpened(id, session?.accountId);
    expectBadgeFocus(id);
    setPick({ from: projectId, to: id });
    router.push(projectSwitchPath(pathname, projectId, id));
  };

  let body;
  if (state === "loading") {
    body = (
      <LoadingRegion loading label={copy.loading}>
        <Skeleton shape="block" className="h-8 w-36 rounded-[var(--radius-jd-sm)]" />
      </LoadingRegion>
    );
  } else if (state === "static") {
    body = <ProjectLabel project={current} />;
  } else if (state === "unavailable") {
    body = (
      <>
        <ProjectLabel project={current} />
        <ProjectBadgeRetry onLoaded={() => setLoadedNote(copy.projectBadge.loaded)} />
      </>
    );
  } else {
    body = (
      <span ref={wrapperRef} data-testid="project-label" aria-busy={shownId !== projectId || undefined} className="inline-flex flex-row min-w-0 max-w-full">
        <Select
          aria-label={`${copy.projectLabel}: ${shownName}`}
          value={shownId}
          onChange={choose}
          placeholder={copy.projectPlaceholder}
          options={projectOptions(options)}
          menuWidth={224}
          className={BADGE}
        />
      </span>
    );
  }

  return (
    <span className="flex min-w-0 max-w-full flex-row flex-wrap items-center gap-2">
      {body}
      <span role="status" className="sr-only">
        {loadedNote}
      </span>
    </span>
  );
}
