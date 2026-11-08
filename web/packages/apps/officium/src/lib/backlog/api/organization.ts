import type { CollaboratorQuota, Nicknames, OrganizationProfile, Person, Team, TeamRole, WriteResult } from "../types";
import { ApiCardTime } from "./card-time";

export class ApiOrganization extends ApiCardTime {
  // ---- organization: people and teams (officium-api.md §8.5) ------------------------------------

  async listPeople(): Promise<Person[]> {
    return this.request<Person[]>("/organization/people");
  }

  async getOrganization(): Promise<OrganizationProfile> {
    return this.request<OrganizationProfile>("/organization");
  }

  async renameOrganization(name: string): Promise<OrganizationProfile> {
    return this.request<OrganizationProfile>("/organization", { method: "PUT", body: JSON.stringify({ name }) });
  }

  async getCollaboratorQuota(): Promise<CollaboratorQuota | null> {
    return this.request<CollaboratorQuota>("/organization/collaborators");
  }

  async getNicknames(): Promise<Nicknames> {
    return this.request<Nicknames>("/organization/nicknames");
  }

  async setNickname(nickname: string): Promise<Nicknames> {
    return this.request<Nicknames>("/organization/nickname", { method: "PUT", body: JSON.stringify({ nickname }) });
  }

  async listTeams(): Promise<Team[]> {
    return this.request<Team[]>("/teams");
  }

  async createTeam(input: { name: string; description?: string }): Promise<Team> {
    return this.request<Team>("/teams", { method: "POST", body: JSON.stringify(input) });
  }

  async updateTeam(teamId: string, input: { expectedVersion: number; name?: string; description?: string }): Promise<WriteResult<Team>> {
    return this.requestVersioned<Team>(`/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  async deleteTeam(teamId: string, expectedVersion: number): Promise<void> {
    await this.request<void>(`/teams/${teamId}?expectedVersion=${expectedVersion}`, { method: "DELETE" });
  }

  async addTeamMember(teamId: string, email: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/members`, { method: "POST", body: JSON.stringify({ email }) });
  }

  async removeTeamMember(teamId: string, accountId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/members/${accountId}`, { method: "DELETE" });
  }

  async grantTeamProject(teamId: string, projectId: string, role: TeamRole): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/projects/${projectId}`, { method: "PUT", body: JSON.stringify({ role }) });
  }

  async revokeTeamProject(teamId: string, projectId: string): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}/projects/${projectId}`, { method: "DELETE" });
  }
}
