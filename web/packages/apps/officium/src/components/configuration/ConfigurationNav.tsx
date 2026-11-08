"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  DoorClosed,
  ArrowUpWideNarrow,
  BellRing,
  Languages,
  ListChecks,
  Share2,
  Plug,
  Shapes,
  SpellCheck,
  TerminalSquare,
  UserCog,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NavGroupLabel, NavItem } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import {
  CONFIGURATION_ENTRIES,
  configurationPath,
  type ConfigurationPlace,
  type ConfigurationSection,
  isProjectless,
  isProjectSection,
} from "../../lib/configuration/places";
import type { Copy } from "../../lib/i18n";
import type { Project } from "../../lib/backlog/types";
import { SectionBack } from "../shell/SectionBack";
import { ConfigurationProjectSelect } from "./ConfigurationProjectSelect";
import { CLOUD_SECTIONS } from "../../lib/cloud-features";
import { IS_LOCAL } from "../../lib/edition";

const ICON: Record<ConfigurationSection, LucideIcon> = {
  organization: UsersRound,
  "work-profile": UserRound,
  integrations: Plug,
  documentation: BookOpen,
  "form-languages": Languages,
  "work-rules": ListChecks,
  precedence: ArrowUpWideNarrow,
  "integration-gate": DoorClosed,
  sharing: Share2,
  capabilities: TerminalSquare,
  "wake-reasons": BellRing,
  glossary: SpellCheck,
  roles: UserCog,
  categories: Shapes,
};

const GROUP_ORDER = ["account", "project", "reference"] as const;

/**
 * The entries of Configuration, grouped (JAVA-1626): the account's, the project's (under the selector) and the catalog's.
 * It is the body of the sidebar frame and of the phone drawer, so it renders no `nav` of its own. A project entry with
 * no project to point at is dimmed and says it needs one, instead of vanishing (Cfg-Org, decided): it stays reachable
 * and opens the page that asks for a project.
 */
export function ConfigurationNav({
  place,
  projectId,
  projects,
  onPick,
  onNavigate,
  copy,
}: {
  place: ConfigurationPlace;
  projectId: string | null | undefined;
  projects: Project[] | null;
  onPick: (projectId: string) => void;
  onNavigate?: () => void;
  copy: Copy["configuration"];
}) {
  const current = place.section;
  return (
    <div className="flex flex-col gap-2">
      {projectId && <SectionBack href={`/app/p/${encodeURIComponent(projectId)}`} label={copy.backToBoard} onNavigate={onNavigate} />}
      {GROUP_ORDER.map((group) => {
        const entries = CONFIGURATION_ENTRIES.filter((e) => e.group === group);
        const isProject = group === "project";
        return (
          <section key={group} className="flex flex-col gap-0.5" aria-labelledby={`config-group-${group}`}>
            <NavGroupLabel id={`config-group-${group}`} role="heading" aria-level={2}>
              {copy.groups[group]}
            </NavGroupLabel>
            {isProject && (
              <div className="px-1 pb-1">
                {projects === null ? (
                  <p role="status" className="px-1 text-sm text-[color:var(--jd-muted)]">
                    {copy.loading}
                  </p>
                ) : projects.some((p) => p.archivedAt === null) ? (
                  <ConfigurationProjectSelect projects={projects} value={projectId} onChange={onPick} copy={copy} />
                ) : (
                  <p className="px-1 text-sm text-[color:var(--jd-muted)]">
                    {copy.noProjects}{" "}
                    <Link href="/app" className="font-medium underline underline-offset-2">
                      {copy.goToProjects}
                    </Link>
                  </p>
                )}
              </div>
            )}
            {entries.map(({ id }) => {
              // While the project list loads there is nothing to point at yet: the entries wait rather than flash dimmed.
              if (isProjectSection(id) && projectId === undefined) return null;
              const Icon = ICON[id];
              const needsProject = isProjectSection(id) && !projectId && !isProjectless(id);
              return (
                <NavItem
                  key={id}
                  asChild
                  current={current === id}
                  className={needsProject ? "opacity-60" : undefined}
                >
                  <Link href={configurationPath(id, projectId)} onClick={onNavigate}>
                    <Icon size={16} aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{copy.sections[id]}</span>
                      {IS_LOCAL && CLOUD_SECTIONS[id] && <span className="text-xs font-normal text-[color:var(--jd-faint)]">Officium Cloud</span>}
                      {needsProject && <span className="text-xs font-normal text-[color:var(--jd-faint)]">{copy.needsProject}</span>}
                    </span>
                  </Link>
                </NavItem>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
