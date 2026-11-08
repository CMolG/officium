"use client";

import { useState } from "react";
import { Archive } from "lucide-react";

import { Button, Text, useConfirmDialog } from "@javadaba/ui";

import { refreshProjectList } from "../../lib/backlog/project-list";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type Project } from "../../lib/backlog/types";
import { ProjectIcon } from "./ProjectIcon";

/**
 * Archived projects, at the bottom of the projects home (Off-Home: "Archived projects get their own place").
 * An archived project keeps everything and is out of every list; Restore brings it back. Nothing here can
 * delete one: that is the project's own menu, on the board. Drawn only when there is one.
 */
export function ArchivedProjects({
  projects,
  repository,
  onRestored,
}: {
  projects: Project[];
  repository: BacklogRepository;
  onRestored: () => void;
}) {
  const confirm = useConfirmDialog();
  const [busy, setBusy] = useState<string | null>(null);
  if (projects.length === 0) return null;

  async function restore(project: Project) {
    setBusy(project.id);
    try {
      const result = await repository.unarchiveProject(project.id, project.version);
      if (isConflict(result)) throw new Error("Someone changed this project first. Try again.");
      await refreshProjectList(repository);
      onRestored();
    } catch (err) {
      await confirm.alert({
        title: `Couldn't restore ${project.name}`,
        description: err instanceof Error ? err.message : "Couldn't reach the Officium API.",
        confirmLabel: "OK",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="archived-heading" className="mt-8 flex flex-col gap-2">
      <h2 id="archived-heading" className="m-0 flex flex-row items-center gap-2 text-sm font-semibold">
        <Archive size={14} aria-hidden="true" /> Archived · {projects.length}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {projects.map((project) => (
          <li key={project.id} className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-card)] px-3 py-2">
            <ProjectIcon icon={project.icon} color={project.iconColor} size={16} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
            <Text size="xs" tone="muted">
              {project.keyPrefix}
            </Text>
            <Button
              type="button"
              register="ui"
              variant="outline"
              size="sm"
              busy={busy === project.id}
              disabled={project.role !== "owner"}
              title={project.role === "owner" ? undefined : "Only the project's owner can restore it"}
              onClick={() => void restore(project)}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
      {confirm.dialog}
    </section>
  );
}
