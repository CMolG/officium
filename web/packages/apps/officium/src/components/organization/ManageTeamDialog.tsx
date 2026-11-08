"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Project, Team } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { TeamMembersSection } from "./TeamMembersSection";
import { TeamProjectsSection } from "./TeamProjectsSection";
import { useTeamAsk, type TeamAsk } from "./use-team-ask";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What a deleted team brings back with it: the team itself, then its members and the projects it granted. */
async function restoreTeam(team: Team, repository: ReturnType<typeof getBacklogRepository>) {
  const created = await repository.createTeam({ name: team.name, description: team.description || undefined });
  for (const member of team.members) await repository.addTeamMember(created.id, member.email);
  for (const grant of team.projects) await repository.grantTeamProject(created.id, grant.projectId, grant.role);
}

function directoryMessage(message: string) {
  // officium-api.md §3's directory errors (`account_not_found`, `ambiguous_account`), shown as an actionable message.
  if (message === "account_not_found") return "No Javadaba account uses that email yet. They need to sign up first.";
  if (message === "ambiguous_account") return "More than one account matches that email. Ask them for the exact address they signed up with.";
  return message || "Couldn't add that member.";
}

/**
 * Manage a team (Cfg-Org "Manage team"): members by email, the projects it grants, and Delete team. Removing a member,
 * revoking a project and deleting the team ask first; every removal and role change offers Undo after.
 */
export function ManageTeamDialog({
  team: initialTeam,
  ownedProjects,
  deleteAsk,
  onClose,
  onChanged,
}: {
  team: Team;
  ownedProjects: Project[];
  /** The panel's own asking, which outlives this dialog: a deleted team's Undo is shown after it closes. */
  deleteAsk: TeamAsk;
  onClose: () => void;
  onChanged: () => void;
}) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [team, setTeam] = useState(initialTeam);
  const [email, setEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();
  const { ask, nodes } = useTeamAsk();

  async function refresh() {
    const teams = await repository.listTeams();
    const fresh = teams.find((t) => t.id === team.id);
    if (fresh) setTeam(fresh);
    onChanged();
  }

  async function addMember() {
    if (!email.trim()) return;
    setMemberError(null);
    try {
      await repository.addTeamMember(team.id, email.trim());
      setEmail("");
      await refresh();
    } catch (err) {
      setMemberError(directoryMessage(err instanceof Error ? err.message : ""));
    }
  }

  async function removeMember(accountId: string, name: string, memberEmail: string) {
    const sure = await ask.confirm({
      title: `Remove ${name} from ${team.name}?`,
      description: `${name} loses what ${team.name} gives them${team.projects.length > 0 ? `: ${team.projects.map((p) => `${p.name}, as ${p.role}`).join("; ")}` : ""}. Access they have another way stays.`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!sure) return;
    await repository.removeTeamMember(team.id, accountId);
    await refresh();
    ask.offer({
      message: `${name} removed from ${team.name}.`,
      undone: `${name} is back in ${team.name}.`,
      undo: async () => {
        await repository.addTeamMember(team.id, memberEmail);
        await refresh();
      },
    });
  }

  async function deleteTeam() {
    const sure = await ask.confirm({
      title: `Delete the ${team.name} team?`,
      description: `Its ${plural(team.members.length, "member loses", "members lose")} the ${plural(team.projects.length, "project", "projects")} it grants. The people and the projects are not deleted.`,
      confirmLabel: "Delete team",
      cancelLabel: "Cancel",
      destructive: true,
    });
    if (!sure) return;
    try {
      await repository.deleteTeam(team.id, team.version);
    } catch {
      // Stale version: someone else (or another tab) changed the team first -- look again rather than delete the wrong snapshot.
      await refresh();
      return;
    }
    onChanged();
    onClose();
    deleteAsk.offer({
      message: `${team.name} deleted.`,
      undone: `${team.name} is back.`,
      undo: async () => {
        await restoreTeam(team, repository);
        onChanged();
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team.name}</DialogTitle>
          <DialogDescription>{team.description || `${plural(team.members.length, "member", "members")} · ${plural(team.projects.length, "project", "projects")}`}</DialogDescription>
        </DialogHeader>

        <TeamMembersSection team={team} email={email} onEmail={setEmail} error={memberError} onAdd={() => void addMember()} onRemove={(m) => void removeMember(m.accountId, m.name, m.email)} />
        <TeamProjectsSection team={team} ownedProjects={ownedProjects} repository={repository} ask={ask} onChanged={refresh} />
        {nodes}

        <DialogFooter>
          <Button type="button" register="ui" variant="destructive" onClick={() => void deleteTeam()} className="sm:mr-auto">
            Delete team
          </Button>
          <Button type="button" register="ui" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
