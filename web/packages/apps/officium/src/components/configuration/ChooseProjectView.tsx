"use client";

import { EmptyState, ListRow } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { useProjectList } from "../../lib/backlog/project-list";
import {
  configurationPath,
  CONFIGURATION_ENTRIES,
  isProjectSection,
  type ConfigurationSection,
} from "../../lib/configuration/places";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "./ConfigPage";

/**
 * Where a project section opens with no project to point at (Cfg-Org "No project chosen"): it says what it needs and
 * lists the projects to pick from, each one a link to the same section on that project.
 */
export function ChooseProjectView({ section }: { section: string | null }) {
  const { configuration } = useCopy();
  const projects = useProjectList();
  const known = CONFIGURATION_ENTRIES.find((entry) => entry.id === section)?.id;
  const target: ConfigurationSection = known && isProjectSection(known) ? known : "work-profile";
  const open = (projects ?? []).filter((p) => p.archivedAt === null);

  return (
    <ConfigPage title={configuration.sections[target]} lede={configuration.chooseProject.body}>
      <EmptyState title={configuration.chooseProject.title(configuration.sections[target])}>
        {projects === null ? configuration.loading : open.length === 0 ? configuration.noProjects : configuration.chooseProject.action}
      </EmptyState>
      {open.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={configuration.projectLabel}>
          {open.map((project) => (
            <li key={project.id}>
              <ListRow asChild actionable>
                <Link href={configurationPath(target, project.id)}>{project.name}</Link>
              </ListRow>
            </li>
          ))}
        </ul>
      )}
    </ConfigPage>
  );
}
