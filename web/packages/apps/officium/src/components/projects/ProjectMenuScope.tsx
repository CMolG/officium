"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@javadaba/ui/navigation";
import { useConfirmDialog } from "@javadaba/ui";
import { FeedbackMenuScope, type MenuProviders } from "@javadaba/ui/feedback";
import { saveFile } from "@javadaba/sdk/platform";

import { setProjectNotice } from "../../lib/backlog/project-notice";
import { refreshProjectList, unpublishProject } from "../../lib/backlog/project-list";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type Project } from "../../lib/backlog/types";
import { PROJECT_MENU_KIND } from "./project-menu-kind";
import { EXPORT_PREPARING, projectEntries } from "./project-menu-entries";
import { EditProjectDialog } from "./EditProjectDialog";
import { MembersDialog } from "./MembersDialog";

/**
 * The menu of a project row or card (JAVA-1554, ADR 0029): Edit, Members, Export backlog, Archive and Delete,
 * declared as data for the feedback layer's one menu, so right-click, long-press, the context-menu key
 * and the visible `MoreButton` all open the same entries. The dialogs they open live here, once
 * per scope, because the sidebar and the projects home have no board to host them.
 */
export function ProjectMenuScope({
  projects,
  repository,
  label,
  onExport,
  children,
}: {
  projects: Project[];
  repository: BacklogRepository;
  label: string;
  /** Runs as an export starts: the sidebar closes its phone drawer so the notice is in view (JAVA-1657). */
  onExport?: () => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const confirm = useConfirmDialog();
  const [editing, setEditing] = useState<Project | null>(null);
  const [membersOf, setMembersOf] = useState<Project | null>(null);

  const remove = useCallback(
    async (project: Project) => {
      const typed = await confirm.prompt({
        title: `Delete ${project.name}?`,
        description: `Deletes ${project.name}, its cards and its documentation for everyone. This cannot be undone.`,
        label: "Type the project's name to confirm",
        placeholder: project.name,
        mustMatch: project.name,
        confirmLabel: "Delete project",
        cancelLabel: "Cancel",
        destructive: true,
      });
      if (typed === null) return;
      try {
        await repository.deleteProject(project.id, typed);
      } catch (err) {
        await confirm.alert({
          title: `Couldn't delete ${project.name}`,
          description: err instanceof Error ? err.message : "Couldn't reach the Officium API.",
          confirmLabel: "OK",
        });
        return;
      }
      unpublishProject(project.id, repository);
      setProjectNotice(`${project.name} was deleted, with its cards and documentation.`);
      router.replace("/app");
    },
    [confirm, repository, router],
  );

  // JAVA-1657: one .zip of the backlog, handed over with saveFile. Progress and the result go to the
  // in-flow project notice (not a fixed bar, which the consent banner covers); a failure is an alert.
  const exportBacklog = useCallback(
    async (project: Project) => {
      onExport?.();
      setProjectNotice(EXPORT_PREPARING);
      try {
        const { blob, filename } = await repository.exportBacklog(project.id);
        await saveFile(blob, filename);
        setProjectNotice(`Exported ${filename}`);
      } catch (err) {
        setProjectNotice(null);
        await confirm.alert({
          title: `Couldn't export ${project.name}`,
          description: err instanceof Error ? err.message : "Couldn't reach the Officium API. Try again.",
          confirmLabel: "OK",
        });
      }
    },
    [confirm, onExport, repository],
  );

  // Archiving is out of the way, not gone: the project leaves the lists, keeps everything, and comes back from
  // Archived on the projects page (Off-Shell, "Archive project is new"). So it asks nothing and says where it went.
  const archive = useCallback(
    async (project: Project) => {
      try {
        const result = await repository.archiveProject(project.id, project.version);
        if (isConflict(result)) throw new Error("Someone changed this project first. Try again.");
        await refreshProjectList(repository);
        setProjectNotice(`${project.name} was archived. Find it under Archived on the projects page.`);
        router.replace("/app");
      } catch (err) {
        await confirm.alert({
          title: `Couldn't archive ${project.name}`,
          description: err instanceof Error ? err.message : "Couldn't reach the Officium API.",
          confirmLabel: "OK",
        });
      }
    },
    [confirm, repository, router],
  );

  const providers = useMemo<MenuProviders>(
    () => ({
      [PROJECT_MENU_KIND]: (ctx) => {
        const project = projects.find((p) => p.id === ctx.targetId);
        return project
          ? projectEntries(project, { edit: setEditing, members: setMembersOf, export: exportBacklog, archive, remove }, repository.persistent)
          : [];
      },
    }),
    [projects, remove, archive, exportBacklog, repository.persistent],
  );

  return (
    <FeedbackMenuScope providers={providers} label={label}>
      {children}
      {editing && (
        <EditProjectDialog
          project={editing}
          repository={repository}
          onClose={() => setEditing(null)}
          onChanged={() => undefined}
        />
      )}
      {membersOf && (
        <MembersDialog
          projectId={membersOf.id}
          repository={repository}
          isOwner={membersOf.role === "owner"}
          onClose={() => setMembersOf(null)}
        />
      )}
      {confirm.dialog}
    </FeedbackMenuScope>
  );
}
