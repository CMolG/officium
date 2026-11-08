import type {
  Assignee,
  Folder,
  GithubRepositories,
  Meta,
  Member,
  Project,
  ProjectColor,
  ProjectMeta,
  Role,
  WriteResult,
} from "../types";
import { ALL_STATUSES } from "../status-config";
import { REJECTION_REASONS } from "../rejection";
import { REVIEW_RETURN_REASONS } from "../review-returns";
import { CATEGORY_GUIDE, CATEGORY_ORDER } from "../category-config";
import { SIGNAL_ORDER } from "../role-config";
import { newId } from "../format";
import { WORK_RULES_TOKEN_QUOTA, totalTokens } from "../../work-rules/tokens";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  isValidProjectColor,
  isValidProjectIcon,
} from "../project-appearance";
import { KEY_PREFIX_PATTERN, now } from "./rules";
import { NO_ROLE_OVERRIDE } from "./sample-record";
import { MemoryCore } from "./core";

export class MemoryWorkspace extends MemoryCore {
  // ---- meta ------------------------------------------------------------------------------------

  async getMeta(): Promise<Meta> {
    return {
      statuses: [...ALL_STATUSES],
      priorities: ["superHigh", "high", "medium", "low", "superLow"],
      runStates: ["idle", "running", "completed", "failed"],
      executors: ["ai", "human"],
      categories: [...CATEGORY_ORDER],
      categoryGuide: CATEGORY_GUIDE.map((entry) => ({ ...entry })),
      signals: [...SIGNAL_ORDER],
      rejectionReasons: REJECTION_REASONS.map((entry) => ({ ...entry })),
      rejectionEnabled: true,
      reviewReturnReasons: REVIEW_RETURN_REASONS.map((entry) => ({ ...entry })),
    };
  }

  // ---- folders -----------------------------------------------------------------------------

  async listFolders(): Promise<Folder[]> {
    return [...this.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(input: { name: string; parentId?: string | null }): Promise<Folder> {
    const folder: Folder = {
      id: newId("folder"),
      parentId: input.parentId ?? null,
      name: input.name,
      createdAt: now(),
      updatedAt: now(),
    };
    this.folders.set(folder.id, folder);
    return { ...folder };
  }

  async updateFolder(id: string, input: { name?: string; parentId?: string | null }): Promise<Folder> {
    const folder = this.folders.get(id);
    if (!folder) throw new Error("folder_not_found");
    if (input.name !== undefined) folder.name = input.name;
    if (input.parentId !== undefined) folder.parentId = input.parentId;
    folder.updatedAt = now();
    return { ...folder };
  }

  async deleteFolder(id: string): Promise<void> {
    const hasChildFolder = [...this.folders.values()].some((f) => f.parentId === id);
    const hasProjects = [...this.records.values()].some((r) => r.project.folderId === id);
    if (hasChildFolder || hasProjects) throw new Error("folder_not_empty");
    this.folders.delete(id);
  }

  // ---- projects ------------------------------------------------------------------------------

  async listProjects(query: { folderId?: string | null; archived?: boolean } = {}): Promise<Project[]> {
    const showArchived = query.archived ?? false;
    return [...this.records.values()]
      .map((r) => r.project)
      .filter((p) => (query.folderId === undefined ? true : p.folderId === query.folderId))
      .filter((p) => (showArchived ? true : !p.archivedAt))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ ...p }));
  }

  async getProject(projectId: string): Promise<Project> {
    await this.holds.get("getProject")?.promise;
    return { ...this.requireRecord(projectId).project };
  }

  async createProject(
    input: { name: string; keyPrefix: string; folderId?: string | null; icon?: string; iconColor?: ProjectColor },
  ): Promise<Project> {
    const keyPrefix = input.keyPrefix.toUpperCase();
    if (!KEY_PREFIX_PATTERN.test(keyPrefix)) throw new Error("invalid_key_prefix");
    const taken = [...this.records.values()].some((r) => r.project.keyPrefix === keyPrefix);
    if (taken) throw new Error("key_prefix_taken");
    if (input.icon !== undefined && !isValidProjectIcon(input.icon)) throw new Error("invalid_icon");
    if (input.iconColor !== undefined && !isValidProjectColor(input.iconColor)) throw new Error("invalid_icon_color");

    const project: Project = {
      id: newId("proj"),
      folderId: input.folderId ?? null,
      name: input.name,
      keyPrefix,
      role: "owner",
      icon: input.icon ?? DEFAULT_PROJECT_ICON,
      iconColor: input.iconColor ?? DEFAULT_PROJECT_COLOR,
      archivedAt: null,
      formLanguages: [],
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      definitionOfDone: [],
      definitionOfDoneTokenQuota: WORK_RULES_TOKEN_QUOTA,
      protected: false,
    };
    const members = new Map<string, Member>();
    members.set(YOU.accountId, {
      accountId: YOU.accountId, email: "you@example.com", name: YOU.name, role: "owner", via: "direct", teamId: null, createdAt: now(),
    });
    this.records.set(project.id, {
      project, cards: new Map(), details: new Map(), members, nextNumber: 1,
      blockEdges: [], sprints: new Map(), nextSprintNumber: 1, transitions: [], docs: new Map(), docTrash: new Map(),
      docNodes: new Map(), docRedirects: new Map(), changelog: [], changelogToken: null, testRuns: [],
      roleMatrix: NO_ROLE_OVERRIDE,
    });
    return { ...project };
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
    const record = this.requireRecord(projectId);
    const project = record.project;
    // Owner-only, checked before the version (officium-api.md §8.1): the caller's own role IS
    // the project's role field in this demo (every record here belongs to `YOU`).
    if ((input.icon !== undefined || input.iconColor !== undefined) && project.role !== "owner") {
      throw new Error("owner_only");
    }
    if (input.icon !== undefined && !isValidProjectIcon(input.icon)) throw new Error("invalid_icon");
    if (input.iconColor !== undefined && !isValidProjectColor(input.iconColor)) throw new Error("invalid_icon_color");
    if (project.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The project changed since you loaded it.", current: { ...project } };
    }
    if (input.name !== undefined) project.name = input.name;
    if (input.folderId !== undefined) project.folderId = input.folderId;
    if (input.icon !== undefined) project.icon = input.icon;
    if (input.iconColor !== undefined) project.iconColor = input.iconColor;
    project.version += 1;
    project.updatedAt = now();
    this.emit(projectId, { type: "project.updated", actor: YOU });
    return { ...project };
  }

  async archiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>> {
    return this.setArchived(projectId, expectedVersion, now());
  }

  async unarchiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>> {
    return this.setArchived(projectId, expectedVersion, null);
  }

  /** The same owner and version rules as the API (JAVA-1446): a refusal throws the code the API answers with. */
  async setDefinitionOfDone(projectId: string, input: { expectedVersion: number; definitionOfDone: string[] }): Promise<Project> {
    const project = this.requireRecord(projectId).project;
    if (project.role !== "owner") throw new Error("owner_only");
    const items = input.definitionOfDone.map((item) => item.trim());
    const distinct = new Set(items.map((item) => item.toLowerCase()));
    if (items.some((item) => !item || item.length > 200) || distinct.size !== items.length) {
      throw new Error("definition_of_done_invalid");
    }
    if (totalTokens(items) > project.definitionOfDoneTokenQuota) throw new Error("work_rules_over_quota");
    if (project.version !== input.expectedVersion) throw new Error("version_conflict");
    project.definitionOfDone = items;
    project.version += 1;
    project.updatedAt = now();
    this.emit(projectId, { type: "project.updated", actor: YOU });
    return { ...project };
  }

  protected setArchived(projectId: string, expectedVersion: number, archivedAt: string | null): WriteResult<Project> {
    const record = this.requireRecord(projectId);
    const project = record.project;
    if (project.version !== expectedVersion) {
      return { error: "version_conflict", message: "The project changed since you loaded it.", current: { ...project } };
    }
    project.archivedAt = archivedAt;
    project.version += 1;
    project.updatedAt = now();
    this.emit(projectId, { type: "project.updated", actor: YOU });
    return { ...project };
  }

  async deleteProject(projectId: string, confirm: string): Promise<void> {
    const project = this.requireRecord(projectId).project;
    if (project.role !== "owner") throw new Error("owner_only");
    if (project.protected) throw new Error("project_protected");
    if (confirm.trim() !== project.name) throw new Error("confirmation_mismatch");
    this.records.delete(projectId);
  }

  // The project menu disables "Export backlog" on the demo (`persistent` is false), so this is
  // only reachable by a caller that ignores that.
  async exportBacklog(): Promise<{ blob: Blob; filename: string }> {
    throw new Error("The demo keeps nothing to export.");
  }

  async getProjectMeta(projectId: string): Promise<ProjectMeta> {
    const record = this.requireRecord(projectId);
    const epics = new Set<string>();
    const tags = new Set<string>();
    const assignees = new Map<string, Assignee>();
    for (const card of record.cards.values()) {
      if (card.epic) epics.add(card.epic);
      for (const t of card.tags) tags.add(t);
      for (const a of card.assignees) assignees.set(a.name, a);
    }
    return {
      epics: [...epics].sort(),
      tags: [...tags].sort(),
      assignees: [...assignees.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  // ---- members -------------------------------------------------------------------------------

  // The demo has no GitHub app to authorize with (officium-api.md §8.10): the repositories a test puts in
  // place with simulateGithubConnected and simulateGithubAvailable are all it knows.
  async getGithubRepositories(projectId: string): Promise<GithubRepositories> {
    this.count("getGithubRepositories");
    this.requireGithubOwner(projectId);
    return { connected: this.githubConnected(projectId), available: this.githubAvailableRepos(projectId), authorizable: false };
  }

  async connectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories> {
    this.requireGithubOwner(projectId);
    if (!this.connectGithub(projectId, repo)) {
      throw new ApiError("github_repository_not_installed", `The Officium GitHub App is not installed on "${repo}" for you`, 404);
    }
    return this.getGithubRepositories(projectId);
  }

  async disconnectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories> {
    this.requireGithubOwner(projectId);
    if (!this.disconnectGithub(projectId, repo)) {
      throw new ApiError("github_repository_not_connected", `"${repo}" does not feed this project`, 404);
    }
    return this.getGithubRepositories(projectId);
  }

  githubAuthorizeUrl(): null {
    return null;
  }

  protected requireGithubOwner(projectId: string): void {
    if (this.requireRecord(projectId).project.role !== "owner") {
      throw new ApiError("owner_only", "Only the project's owner connects GitHub repositories", 403);
    }
  }

  async listMembers(projectId: string): Promise<Member[]> {
    return [...this.requireRecord(projectId).members.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async inviteMember(projectId: string, input: { email: string; role: Role }): Promise<Member> {
    const record = this.requireRecord(projectId);
    this.requireCollaboratorRoom(1);
    const member: Member = {
      accountId: newId("acc"),
      email: input.email,
      name: input.email.split("@")[0] ?? input.email,
      role: input.role,
      via: "direct",
      teamId: null,
      createdAt: now(),
    };
    record.members.set(member.accountId, member);
    this.emit(projectId, { type: "member.changed", actor: YOU });
    return { ...member };
  }

  async updateMemberRole(projectId: string, accountId: string, role: Role): Promise<Member> {
    const record = this.requireRecord(projectId);
    const member = record.members.get(accountId);
    if (!member) throw new Error("member_not_found");
    member.role = role;
    this.emit(projectId, { type: "member.changed", actor: YOU });
    return { ...member };
  }

  async removeMember(projectId: string, accountId: string): Promise<void> {
    const record = this.requireRecord(projectId);
    record.members.delete(accountId);
    this.emit(projectId, { type: "member.changed", actor: YOU });
  }

  // ---- cards -----------------------------------------------------------------------------------
}
