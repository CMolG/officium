"use client";

import { Select } from "@javadaba/ui";

import type { Copy } from "../../lib/i18n";
import type { Project } from "../../lib/backlog/types";
import { projectOptions } from "../projects/project-select-options";

/**
 * The project selector at the head of the Project group (JAVA-1626): one list for every Configuration page, so a person
 * changes project in place. It lists the projects the person can see that are not archived, as the other pickers do.
 */
export function ConfigurationProjectSelect({
  projects,
  value,
  onChange,
  copy,
}: {
  projects: Project[];
  value: string | null | undefined;
  onChange: (projectId: string) => void;
  copy: Copy["configuration"];
}) {
  const open = projects.filter((p) => p.archivedAt === null);
  return (
    <Select
      aria-label={copy.projectLabel}
      value={value ?? ""}
      onChange={onChange}
      placeholder={copy.projectPlaceholder}
      options={projectOptions(open)}
      className="min-h-11 w-full"
    />
  );
}
