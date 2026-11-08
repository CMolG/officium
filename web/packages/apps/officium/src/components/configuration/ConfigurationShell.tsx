"use client";

import { useState, type ReactNode } from "react";
import { useAuthSession } from "@javadaba/account";
import { usePathname, useRouter } from "@javadaba/ui/navigation";

import { recordProjectOpened } from "../../lib/backlog/last-project";
import { useProjectList } from "../../lib/backlog/project-list";
import { configurationPath, configurationPlace, isProjectSection } from "../../lib/configuration/places";
import { useConfigProject } from "../../lib/configuration/use-config-project";
import { useCopy } from "../../lib/i18n/use-copy";
import { SectionShell } from "../shell/SectionShell";
import type { SidebarFrameKeys } from "../shell/SidebarFrame";
import { ConfigurationNav } from "./ConfigurationNav";
import { CLOUD_SECTIONS } from "../../lib/cloud-features";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLockedPage } from "../cloud/CloudLockedPage";

/** Configuration remembers its own fold and width, per viewer: its keys are its own, not Documentation's (JAVA-1626). */
const FOLD_KEY = "officium:configuration:sidebar-collapsed:v1";
const WIDTH_KEY = "officium:configuration:sidebar-width:v1";

/**
 * The Configuration frame (JAVA-1626): the sidebar of its sections beside the page, the layout's ground for every
 * Configuration route. Mounted by the `configuration` LAYOUT, so moving between sections keeps the frame, its scroll,
 * its fold and the project selector (the same reason as the documentation layout, JAVA-1536). On a phone the sections
 * open in a drawer behind a button.
 */
export function ConfigurationShell({ children }: { children: ReactNode }) {
  const copy = useCopy().configuration;
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { session } = useAuthSession();
  const place = configurationPlace(pathname);
  const [picked, setPicked] = useState<string | null>(null);
  const projects = useProjectList();
  const projectId = useConfigProject(place.projectId, picked);

  // The selector: remember the pick for this person (it survives a reload), then stay on the same section for the new
  // project. On a reference page, the pick only changes which project the Project group links to.
  function pick(next: string) {
    setPicked(next);
    recordProjectOpened(next, session?.accountId);
    if (place.section && isProjectSection(place.section)) router.push(configurationPath(place.section, next));
  }

  const frame: SidebarFrameKeys = {
    label: copy.navigation,
    foldKey: FOLD_KEY,
    widthKey: WIDTH_KEY,
    testIds: { frame: "config-sidebar", tree: "config-tree", splitter: "config-sidebar-splitter" },
  };
  const nav = (onNavigate?: () => void) => (
    <ConfigurationNav
      place={place}
      projectId={projectId}
      projects={projects}
      onPick={pick}
      onNavigate={onNavigate}
      copy={copy}
    />
  );
  const lockedFeature = IS_LOCAL && place.section ? CLOUD_SECTIONS[place.section] : undefined;
  const current = place.section ? copy.sections[place.section] : copy.title;

  return (
    <SectionShell
      frame={frame}
      drawer={{ title: copy.navigation, closeLabel: copy.closeSections, testId: "config-drawer" }}
      openLabel={copy.openSections}
      current={current}
      nav={nav}
    >
      {lockedFeature && place.section ? <CloudLockedPage feature={lockedFeature} title={copy.sections[place.section]} /> : children}
    </SectionShell>
  );
}
