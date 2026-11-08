"use client";

import { useState } from "react";
import { Button, Note, Select, Text } from "@javadaba/ui";
import { ShieldCheck } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Project, Team, TeamRole } from "../../lib/backlog/types";
import { FIELD_SELECT } from "../../lib/field-select";
import { ProjectIcon } from "../projects/ProjectIcon";
import type { TeamAsk } from "./use-team-ask";

export const TEAM_ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

/**
 * The "Projects" block of a team: which of the owner's projects it reaches, and as what. A grant past the collaborator
 * limit is refused, and the server's sentence is shown here (JAVA-1009). Revoking asks first; a role change applies at
 * once; both offer Undo after (Cfg-Org, "Ask first, undo after").
 */
export function TeamProjectsSection({
  team,
  ownedProjects,
  repository,
  ask,
  onChanged,
}: {
  team: Team;
  ownedProjects: Project[];
  repository: BacklogRepository;
  ask: TeamAsk;
  onChanged: () => Promise<void>;
}) {
  const [grantProjectId, setGrantProjectId] = useState<string | null>(null);
  const [grantRole, setGrantRole] = useState<TeamRole>("editor");
  const [grantError, setGrantError] = useState<string | null>(null);

  const grantable = ownedProjects.filter((p) => !team.projects.some((g) => g.projectId === p.id));

  async function grantProject() {
    if (!grantProjectId) return;
    setGrantError(null);
    try {
      await repository.grantTeamProject(team.id, grantProjectId, grantRole);
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : "Couldn't grant that project.");
      await onChanged();
      return;
    }
    setGrantProjectId(null);
    await onChanged();
  }

  async function changeRole(projectId: string, name: string, from: TeamRole, to: TeamRole) {
    await repository.grantTeamProject(team.id, projectId, to);
    await onChanged();
    ask.offer({
      message: `${team.name} is now ${to === "editor" ? "an editor" : "a viewer"} on ${name}.`,
      undone: `${team.name} is ${from === "editor" ? "an editor" : "a viewer"} on ${name} again.`,
      undo: async () => {
        await repository.grantTeamProject(team.id, projectId, from);
        await onChanged();
      },
    });
  }

  async function revoke(projectId: string, name: string, role: TeamRole) {
    const sure = await ask.confirm({
      title: `Revoke ${team.name}'s access to ${name}?`,
      description: `${team.members.length} ${team.members.length === 1 ? "person loses" : "people lose"} access to it, unless they have it another way.`,
      confirmLabel: "Revoke",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!sure) return;
    await repository.revokeTeamProject(team.id, projectId);
    await onChanged();
    ask.offer({
      message: `${team.name} no longer has ${name}.`,
      undone: `${team.name} has ${name} again.`,
      undo: async () => {
        await repository.grantTeamProject(team.id, projectId, role);
        await onChanged();
      },
    });
  }

  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Projects</h3>
      {grantable.length > 0 && (
        // Project, role and the action, one per line on a phone (JAVA-59).
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Select aria-label="Project to grant" value={grantProjectId} onChange={setGrantProjectId} placeholder="Pick a project" options={grantable.map((p) => ({ value: p.id, label: p.name }))} className={`${FIELD_SELECT} min-w-0 sm:flex-1`} />
          <Select aria-label="Role to grant" value={grantRole} onChange={(v) => setGrantRole(v as TeamRole)} options={TEAM_ROLE_OPTIONS} className={`${FIELD_SELECT} sm:w-auto`} />
          <Button type="button" register="ui" size="sm" disabled={!grantProjectId} onClick={() => void grantProject()}>
            <ShieldCheck size={14} /> Grant
          </Button>
        </div>
      )}
      {grantError && <Note tone="danger">{grantError}</Note>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {team.projects.length === 0 ? (
          <li className="text-sm text-[color:var(--jd-muted)]">
            <Text>No project access granted yet.</Text>
          </li>
        ) : (
          team.projects.map((grant) => (
            <li key={grant.projectId} className="flex flex-row items-center gap-2 rounded-xl bg-[color:var(--jd-card)] px-3 py-2 text-sm">
              <ProjectIcon icon={grant.icon} color={grant.iconColor} size={14} />
              <span className="min-w-0 flex-1 truncate">{grant.name}</span>
              <Select
                aria-label={`Role on ${grant.name}`}
                value={grant.role}
                onChange={(v) => void changeRole(grant.projectId, grant.name, grant.role, v as TeamRole)}
                options={TEAM_ROLE_OPTIONS}
              />
              <Button type="button" register="ui" variant="ghost" size="sm" aria-label={`Revoke access to ${grant.name}`} onClick={() => void revoke(grant.projectId, grant.name, grant.role)}>
                Revoke
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
