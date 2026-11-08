import type { Folder, GithubRepositories, Member, Meta, Project, ProjectColor, ProjectMeta, Role, WriteResult } from "../types";
import { ApiCore } from "./core";

export class ApiWorkspace extends ApiCore {
  // ---- meta --------------------------------------------------------------------------------

  async getMeta(): Promise<Meta> {
    return this.request<Meta>("/meta");
  }

  // ---- folders -------------------------------------------------------------------------------

  async listFolders(): Promise<Folder[]> {
    return this.request<Folder[]>("/folders");
  }

  async createFolder(input: { name: string; parentId?: string | null }): Promise<Folder> {
    return this.request<Folder>("/folders", { method: "POST", body: JSON.stringify(input) });
  }

  async updateFolder(id: string, input: { name?: string; parentId?: string | null }): Promise<Folder> {
    return this.request<Folder>(`/folders/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  async deleteFolder(id: string): Promise<void> {
    await this.request<void>(`/folders/${id}`, { method: "DELETE" });
  }

  // ---- projects ------------------------------------------------------------------------------

  async listProjects(query: { folderId?: string | null; archived?: boolean } = {}): Promise<Project[]> {
    const params = new URLSearchParams();
    if (query.folderId) params.set("folderId", query.folderId);
    if (query.archived !== undefined) params.set("archived", String(query.archived));
    const qs = params.toString();
    return this.request<Project[]>(`/projects${qs ? `?${qs}` : ""}`);
  }

  async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}`);
  }

  async createProject(
    input: { name: string; keyPrefix: string; folderId?: string | null; icon?: string; iconColor?: ProjectColor },
  ): Promise<Project> {
    return this.request<Project>("/projects", { method: "POST", body: JSON.stringify(input) });
  }

  async updateProject(
    projectId: string,
    input: {
      expectedVersion: number;
      name?: string;
      folderId?: string | null;
      icon?: string;
      iconColor?: ProjectColor;
    },
  ): Promise<WriteResult<Project>> {
    return this.requestVersioned<Project>(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  async archiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>> {
    return this.requestVersioned<Project>(`/projects/${projectId}/archive`, {
      method: "POST",
      body: JSON.stringify({ expectedVersion }),
    });
  }

  async unarchiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>> {
    return this.requestVersioned<Project>(`/projects/${projectId}/unarchive`, {
      method: "POST",
      body: JSON.stringify({ expectedVersion }),
    });
  }

  async setDefinitionOfDone(projectId: string, input: { expectedVersion: number; definitionOfDone: string[] }): Promise<Project> {
    return this.request<Project>(`/projects/${projectId}/definition-of-done`, { method: "PUT", body: JSON.stringify(input) });
  }

  async deleteProject(projectId: string, confirm: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}?confirm=${encodeURIComponent(confirm)}`, { method: "DELETE" });
  }

  async exportBacklog(projectId: string): Promise<{ blob: Blob; filename: string }> {
    return this.download(`/projects/${projectId}/export/backlog.zip`);
  }

  async getProjectMeta(projectId: string): Promise<ProjectMeta> {
    return this.request<ProjectMeta>(`/projects/${projectId}/meta`);
  }

  // ---- GitHub ------------------------------------------------------------------------------

  async getGithubRepositories(projectId: string): Promise<GithubRepositories> {
    return this.request<GithubRepositories>(`/projects/${projectId}/github/repositories`);
  }

  async connectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories> {
    return this.request<GithubRepositories>(`/projects/${projectId}/github/repositories`, {
      method: "PUT",
      body: JSON.stringify({ repo }),
    });
  }

  async disconnectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories> {
    return this.request<GithubRepositories>(`/projects/${projectId}/github/repositories/${repo}`, { method: "DELETE" });
  }

  githubAuthorizeUrl(projectId: string, install: boolean): string {
    return `${this.base}/github/authorize?projectId=${encodeURIComponent(projectId)}${install ? "&install=true" : ""}`;
  }

  // ---- members -------------------------------------------------------------------------------

  async listMembers(projectId: string): Promise<Member[]> {
    return this.request<Member[]>(`/projects/${projectId}/members`);
  }

  async inviteMember(projectId: string, input: { email: string; role: Role }): Promise<Member> {
    return this.request<Member>(`/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(input) });
  }

  async updateMemberRole(projectId: string, accountId: string, role: Role): Promise<Member> {
    return this.request<Member>(`/projects/${projectId}/members/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(projectId: string, accountId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/members/${accountId}`, { method: "DELETE" });
  }
}
