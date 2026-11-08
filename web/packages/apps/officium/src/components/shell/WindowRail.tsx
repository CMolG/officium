"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@javadaba/ui/navigation";
import { Badge, MenuItem, NavItem, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@javadaba/ui";
import { Bolt, ChevronDown, FolderKanban } from "lucide-react";

import { useProjectList } from "../../lib/backlog/project-list";
import { setWindowTitle } from "../../lib/shell/window-bridge";
import { usePendingChangelogCount } from "../../lib/docs/changelog-count";
import { ProjectBadgeSelect } from "../projects/ProjectBadgeSelect";
import { WindowMenu } from "./WindowMenu";
import { VIEWS, viewOf, type View } from "./sidebar-views";

/**
 * The way into every view from inside a desktop window (Off-Shell, "In a window"; decided by the
 * owner): the window is the chrome there, so there is no product bar and no sidebar, and five of
 * the six views had no way in. One row of 44 px under the title bar: Projects, the project
 * switcher, the views, Configuration. The badges travel with it ("2 pending" on Documentation,
 * "Experimental" on Systema), and the window's title follows ("Officium · Javadaba web · Task
 * Board"). Below 900 px the views fold into a Views menu; the switcher and Configuration stay.
 */
export function WindowRail() {
  const pathname = usePathname();
  const projectId = /^\/app\/p\/([^/]+)/.exec(pathname)?.[1];
  const inConfiguration = pathname.startsWith("/app/configuration");
  const view = projectId ? VIEWS.find((v) => v.id === viewOf(pathname, projectId)) : undefined;
  const project = useProjectList(projectId)?.find((p) => p.id === projectId);
  const pending = usePendingChangelogCount(projectId);

  const where = inConfiguration ? "Configuration" : projectId ? (view?.label ?? "Task Board") : "Projects";
  const title = ["Officium", projectId ? project?.name : undefined, projectId || inConfiguration ? where : undefined]
    .filter(Boolean)
    .join(" · ");
  useEffect(() => {
    setWindowTitle(title || "Officium");
  }, [title]);

  const badge = (v: View) => (v.id === "docs" && pending ? `${pending} pending` : v.badge);

  return (
    <nav
      aria-label="Project"
      className="flex h-11 shrink-0 flex-row items-center gap-0.5 overflow-hidden border-b border-[color:var(--jd-line)] bg-[color:var(--jd-page)] px-2.5"
    >
      <NavItem asChild current={pathname === "/app"} className="min-h-9 gap-1.5 px-2.5">
        <Link href="/app">
          <FolderKanban size={15} aria-hidden="true" />
          <span>Projects</span>
        </Link>
      </NavItem>
      {projectId && (
        <>
          <span aria-hidden="true" className="mx-1 h-[22px] w-px shrink-0 bg-[color:var(--jd-line)]" />
          <ProjectBadgeSelect projectId={projectId} project={project ?? null} />
          <div className="ml-1 hidden min-w-0 flex-row items-center gap-0.5 min-[900px]:flex">
            {VIEWS.map((v) => (
              <NavItem key={v.id} asChild current={view?.id === v.id && !inConfiguration} className="min-h-9 gap-1.5 whitespace-nowrap px-2.5">
                <Link href={v.href(projectId)}>
                  <v.icon size={15} aria-hidden="true" />
                  <span>{v.label}</span>
                  {badge(v) && (
                    <Badge register="tag" size="xs" tone={v.badge ? "info" : "neutral"} fill="subtle">
                      {badge(v)}
                    </Badge>
                  )}
                </Link>
              </NavItem>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <NavItem asChild className="min-h-9 gap-1.5 px-2.5 min-[900px]:hidden">
                <button type="button">
                  <span>Views</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </NavItem>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-1.5">
              {VIEWS.map((v) => (
                <PopoverClose key={v.id} asChild>
                  <MenuItem as={Link} href={v.href(projectId)} aria-current={view?.id === v.id ? "page" : undefined}>
                    <v.icon size={16} aria-hidden="true" />
                    <span>{v.label}</span>
                    {badge(v) && (
                      <Badge register="tag" size="xs" tone={v.badge ? "info" : "neutral"} fill="subtle" className="ml-auto">
                        {badge(v)}
                      </Badge>
                    )}
                  </MenuItem>
                </PopoverClose>
              ))}
            </PopoverContent>
          </Popover>
        </>
      )}
      <NavItem asChild current={inConfiguration} className="ml-auto min-h-9 gap-1.5 px-2.5">
        <Link href="/app/configuration/organization">
          <Bolt size={15} aria-hidden="true" />
          <span>Configuration</span>
        </Link>
      </NavItem>
      <WindowMenu projectId={projectId} />
    </nav>
  );
}
