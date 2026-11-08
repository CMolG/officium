import type {
  CollaboratorQuota,
  Nicknames,
  OrganizationProfile,
  Person,
  Team,
  TeamRole,
  WriteResult,
} from "../types";
import { newId } from "../format";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { SEED_MEMBERS } from "./sample-record";
import { MemoryMetrics } from "./metrics";

export class MemoryOrganization extends MemoryMetrics {
  async listPeople(): Promise<Person[]> {
    const byAccount = new Map<string, Person>();
    for (const record of this.records.values()) {
      if (record.project.role !== "owner") continue;
      for (const member of record.members.values()) {
        if (member.accountId === YOU.accountId) continue;
        const person = byAccount.get(member.accountId) ?? {
          accountId: member.accountId, email: member.email, name: member.name, projects: [], teams: [],
        };
        person.projects.push({
          projectId: record.project.id, name: record.project.name, keyPrefix: record.project.keyPrefix,
          role: member.role, via: member.via, teamId: member.teamId,
        });
        byAccount.set(member.accountId, person);
      }
    }
    for (const team of this.teams.values()) {
      for (const member of team.members) {
        const person = byAccount.get(member.accountId) ?? { accountId: member.accountId, email: member.email, name: member.name, projects: [], teams: [] };
        if (!person.teams.some((t) => t.id === team.id)) person.teams.push({ id: team.id, name: team.name });
        for (const grant of team.projects) {
          if (!person.projects.some((p) => p.projectId === grant.projectId && p.teamId === team.id)) {
            person.projects.push({ projectId: grant.projectId, name: grant.name, keyPrefix: grant.keyPrefix, role: grant.role, via: "team", teamId: team.id });
          }
        }
        byAccount.set(member.accountId, person);
      }
    }
    return [...byAccount.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  // JAVA-1780: the organization's name. The demo starts with its own default; a rename replaces it.
  protected organizationName = "Your organization";

  async getOrganization(): Promise<OrganizationProfile> {
    return {
      id: YOU.accountId,
      name: this.organizationName,
      owner: { accountId: YOU.accountId, name: YOU.name, email: SEED_MEMBERS.find((m) => m.actor.accountId === YOU.accountId)?.email ?? "" },
    };
  }

  async renameOrganization(name: string): Promise<OrganizationProfile> {
    const value = name.trim().replace(/\s+/g, " ");
    if (value.length < 2 || value.length > 60 || /\p{Cc}/u.test(value)) throw new Error("organization_name_invalid");
    this.organizationName = value;
    return this.getOrganization();
  }

  // JAVA-199: the caller's organization's nicknames. Same rules as the API: 2-32 letters, digits,
  // dots, underscores or hyphens, unique regardless of case.
  protected readonly nicknames = new Map<string, string>();

  async getNicknames(): Promise<Nicknames> {
    return {
      organizationId: YOU.accountId,
      mine: this.nicknames.get(YOU.accountId) ?? null,
      nicknames: [...this.nicknames].map(([accountId, nickname]) => ({ accountId, nickname })),
    };
  }

  async setNickname(nickname: string): Promise<Nicknames> {
    const value = nickname.trim();
    if (!value) {
      this.nicknames.delete(YOU.accountId);
      return this.getNicknames();
    }
    if (!/^[\p{L}\p{N}._-]{2,32}$/u.test(value)) throw new Error("nickname_invalid");
    const taken = [...this.nicknames].some(
      ([accountId, other]) => accountId !== YOU.accountId && other.toLowerCase() === value.toLowerCase(),
    );
    if (taken) throw new Error("nickname_taken");
    this.nicknames.set(YOU.accountId, value);
    return this.getNicknames();
  }

  async listTeams(): Promise<Team[]> {
    return [...this.teams.values()].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ ...t, members: [...t.members], projects: [...t.projects] }));
  }

  protected requireTeam(teamId: string): Team {
    const team = this.teams.get(teamId);
    if (!team) throw new Error("team_not_found");
    return team;
  }

  async createTeam(input: { name: string; description?: string }): Promise<Team> {
    const team: Team = {
      id: newId("team"), name: input.name.trim(), description: input.description ?? "",
      version: 1, createdAt: now(), updatedAt: now(), members: [], projects: [],
    };
    this.teams.set(team.id, team);
    return { ...team };
  }

  async updateTeam(teamId: string, input: { expectedVersion: number; name?: string; description?: string }): Promise<WriteResult<Team>> {
    const team = this.requireTeam(teamId);
    if (team.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The team changed since you loaded it.", current: { ...team } };
    }
    if (input.name !== undefined && input.name.trim()) team.name = input.name.trim();
    if (input.description !== undefined) team.description = input.description;
    team.version += 1;
    team.updatedAt = now();
    return { ...team };
  }

  async deleteTeam(teamId: string, expectedVersion: number): Promise<void> {
    const team = this.requireTeam(teamId);
    if (team.version !== expectedVersion) throw new Error("version_conflict");
    this.teams.delete(teamId);
  }

  /** Same best-effort directory the project invitation uses (officium-api.md §3): match by
   *  display name against the seed's members, `ambiguous_account` on more than one hit.
   *  `inviteMember` stays permissive (any new email becomes a new account) so day-to-day use of
   *  the demo isn't blocked; two sentinel addresses exist ONLY so the e2e suite can exercise the
   *  directory's actual error states -- a real API answers `account_not_found` for a genuinely
   *  unknown email too, which the permissive default can't demonstrate on its own. */
  protected resolveAccountByEmail(email: string): { accountId: string; name: string; email: string } {
    const normalized = email.trim().toLowerCase();
    if (normalized === "notfound@example.com") throw new Error("account_not_found");
    if (normalized === "ambiguous@example.com") throw new Error("ambiguous_account");
    const candidates = SEED_MEMBERS.filter((m) => m.email.toLowerCase() === normalized);
    if (candidates.length === 0) {
      return { accountId: newId("acc"), name: email.split("@")[0] ?? email, email };
    }
    const m = candidates[0]!;
    return { accountId: m.actor.accountId, name: m.actor.name, email: m.email };
  }

  async getCollaboratorQuota(): Promise<CollaboratorQuota | null> {
    return this.collaboratorQuota ? { ...this.collaboratorQuota } : null;
  }

  async addTeamMember(teamId: string, email: string): Promise<Team> {
    const team = this.requireTeam(teamId);
    const account = this.resolveAccountByEmail(email);
    if (!team.members.some((m) => m.accountId === account.accountId)) {
      // A team that grants nothing gives no access, so its new member is not counted yet.
      if (team.projects.length > 0) this.requireCollaboratorRoom(1);
      team.members.push({ ...account, addedAt: now() });
      team.updatedAt = now();
      for (const grant of team.projects) {
        this.emit(grant.projectId, { type: "member.changed", actor: YOU });
      }
    }
    return { ...team };
  }

  async removeTeamMember(teamId: string, accountId: string): Promise<Team> {
    const team = this.requireTeam(teamId);
    team.members = team.members.filter((m) => m.accountId !== accountId);
    team.updatedAt = now();
    for (const grant of team.projects) {
      this.emit(grant.projectId, { type: "member.changed", actor: YOU });
    }
    return { ...team };
  }

  async grantTeamProject(teamId: string, projectId: string, role: TeamRole): Promise<Team> {
    const team = this.requireTeam(teamId);
    const record = this.records.get(projectId);
    if (!record || record.project.role !== "owner") throw new Error("project_not_found");
    const existing = team.projects.find((p) => p.projectId === projectId);
    if (existing) existing.role = role;
    else {
      // The demo does not know which members are counted already: the team's members all count as new.
      this.requireCollaboratorRoom(team.members.length);
      team.projects.push({
        projectId, name: record.project.name, keyPrefix: record.project.keyPrefix,
        icon: record.project.icon, iconColor: record.project.iconColor, role,
      });
    }
    team.updatedAt = now();
    this.emit(projectId, { type: "member.changed", actor: YOU });
    return { ...team };
  }

  async revokeTeamProject(teamId: string, projectId: string): Promise<Team> {
    const team = this.requireTeam(teamId);
    team.projects = team.projects.filter((p) => p.projectId !== projectId);
    team.updatedAt = now();
    this.emit(projectId, { type: "member.changed", actor: YOU });
    return { ...team };
  }

  // ---- documentation (officium-api.md §8.7) --------------------------------------------------
}
