"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AvatarGroup, Button, EmptyState, ListRow, Skeleton, Text } from "@javadaba/ui";
import { Plus } from "lucide-react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { refreshProjectList } from "../../lib/backlog/project-list";
import type { Project, Team } from "../../lib/backlog/types";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { ManageTeamDialog } from "./ManageTeamDialog";
import { useTeamAsk } from "./use-team-ask";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The Teams tab (Cfg-Org): each team with its members, the projects it grants and Manage; New team; its empty and failed states. */
export function TeamsPanel({ onCount }: { onCount: (count: number) => void }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTeam, setManageTeam] = useState<Team | null>(null);
  const { ask, nodes } = useTeamAsk();

  const load = useCallback(async () => {
    try {
      const [teamList, projects] = await Promise.all([repository.listTeams(), refreshProjectList()]);
      setTeams(teamList);
      onCount(teamList.length);
      setOwnedProjects(projects.filter((p) => p.role === "owner"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load teams.");
    }
  }, [repository, onCount]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  if (error) {
    return (
      <ConfigLoadError title="Couldn't load the teams" detail={error} onRetry={() => void load()} />
    );
  }

  const newTeam = (
    <Button type="button" register="ui" size="sm" onClick={() => setCreateOpen(true)}>
      <Plus size={14} /> New team
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-center justify-between gap-3">
        <Text className="text-sm text-[color:var(--jd-muted)]">A team shares projects with several people at once.</Text>
        {teams !== null && teams.length > 0 && newTeam}
      </div>

      {teams === null ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading the teams">
          <Skeleton shape="block" className="h-16 w-full" />
          <Skeleton shape="block" className="h-16 w-full" />
        </div>
      ) : teams.length === 0 ? (
        <EmptyState title="No teams yet" action={newTeam}>
          A team grants editor or viewer access to several of your projects at once.
        </EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {teams.map((team) => (
            <li key={team.id}>
              <ListRow className="gap-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-semibold">{team.name}</p>
                  <p className="m-0 truncate text-xs text-[color:var(--jd-muted)]">
                    {plural(team.members.length, "member", "members")} · {plural(team.projects.length, "project", "projects")}
                    {team.projects.length > 0 && ` · ${team.projects.map((p) => `${p.name}, ${p.role}`).join("; ")}`}
                  </p>
                </div>
                <AvatarGroup people={team.members} max={3} size="s" />
                <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setManageTeam(team)}>
                  Manage
                </Button>
              </ListRow>
            </li>
          ))}
        </ul>
      )}
      {nodes}

      {createOpen && (
        <CreateTeamDialog
          onClose={() => setCreateOpen(false)}
          onCreate={async (input) => {
            await repository.createTeam(input);
            setCreateOpen(false);
            await load();
          }}
        />
      )}
      {manageTeam && <ManageTeamDialog team={manageTeam} ownedProjects={ownedProjects} deleteAsk={ask} onClose={() => setManageTeam(null)} onChanged={load} />}
    </div>
  );
}
