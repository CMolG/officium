import type {
  Actor,
  AgentWork,
  Card,
  ChangeEvent,
  CollaboratorQuota,
  Folder,
  RoleMatrix,
  Team,
} from "../types";
import { ApiError } from "../api-error";
import { collaboratorFullMessage } from "../collaborator-quota";
import { overlay } from "../role-matrix";
import { activeProfileMatrix } from "../../profiles/memory-profiles";
import { keptOverrides } from "../../billing/owner-plan";
import { totalHours } from "../format";
import { YOU } from "../memory-seed";
import { CardRequestStore } from "../card-requests-memory";
import type { CardRequest, RequestAnswer } from "../card-requests";
import { now } from "./rules";
import { ProjectRecord } from "./sample-record";

export class MemoryCore {
  readonly persistent = false;
  protected folders = new Map<string, Folder>();
  protected records = new Map<string, ProjectRecord>();
  protected listeners = new Map<string, Set<(event: ChangeEvent) => void>>();
  /** projectId -> cardId -> session. No expiry here: the mock has no agent that can crash. */
  protected working = new Map<string, Map<string, AgentWork>>();
  /**
   * JDB-244: the demo's stand-in for the project's machine. Connected by default so attachments
   * work with no agent around; the e2e suite can take it offline (`mock-test-hooks.ts`). The
   * "machine's disk" is this map: attachment id -> the file as uploaded.
   */
  protected machineOnline = new Map<string, boolean>();
  protected machineFiles = new Map<string, Blob>();
  /** Reads the board repeats on every live event, counted: what a burst of agent writes costs the
   *  page (`mock-test-hooks.ts`'s `repositoryCalls`). */
  readonly calls: Record<string, number> = {};
  /** Officium's own teams (officium-api.md §8.5): owned by an account, not scoped to one
   *  project, so they live at the repository level, not inside a `ProjectRecord`. */
  protected teams = new Map<string, Team>();

  /** The matrix a project's cards are read against: the default, its active work profile (card://JAVA-1524),
   *  then its own override. */
  protected readonly matrixOf = (projectId: string): RoleMatrix => {
    const base = activeProfileMatrix(projectId);
    const overrides = keptOverrides(this.records.get(projectId)?.roleMatrix.overrides);
    return overrides ? overlay(base, overrides) : base;
  };

  /** Counted reads the e2e suite makes fail on purpose (`mock-test-hooks.ts`'s
   *  `simulateReadFailure`), so an error state and its retry can be reached: method -> calls left. */
  protected readonly failing: Record<string, number> = {};
  protected readonly holds = new Map<string, { promise: Promise<void>; release: () => void }>();

  failReads(method: string, times: number) {
    this.failing[method] = times;
  }

  /** Test-only: `method`'s reads wait until it is let go, so a spec sees the loading state. */
  holdReads(method: string, held: boolean) {
    if (!held) return this.holds.get(method)?.release();
    let release = () => {};
    const promise = new Promise<void>((resolve) => (release = () => (this.holds.delete(method), resolve())));
    this.holds.set(method, { promise, release });
  }

  /** Test-only (`simulateCollaboratorQuota`): the owner's collaborator count against the cap. Unset,
   *  the demo's own seed owner is never full, and the count is not computed here (JAVA-1009). */
  protected collaboratorQuota: CollaboratorQuota | null = null;

  setCollaboratorQuota(quota: CollaboratorQuota | null) {
    this.collaboratorQuota = quota;
  }

  /** Refuses adding `joining` new people when the set quota is already full: what the server does
   *  with `business_plan_required` (JAVA-1009). A quota under its cap, or none set, lets it through. */
  protected requireCollaboratorRoom(joining: number) {
    const quota = this.collaboratorQuota;
    if (!quota || joining <= 0 || quota.used < quota.cap) return;
    throw new ApiError("business_plan_required", collaboratorFullMessage(quota.cap, quota.used), 403);
  }

  private readonly githubRepos = new Map<string, string[]>();
  private readonly githubAvailable = new Map<string, string[]>();

  /** Test-only (`simulateGithubConnected`): the repositories the demo's GitHub says feed the project. */
  setGithubConnected(projectId: string, repos: string[]) {
    this.githubRepos.set(projectId, repos);
  }

  /** Test-only (`simulateGithubAvailable`): the repositories the caller may connect to the project. */
  setGithubAvailable(projectId: string, repos: string[]) {
    this.githubAvailable.set(projectId, repos);
  }

  protected githubConnected(projectId: string) {
    return (this.githubRepos.get(projectId) ?? []).map((repo) => ({ repo, installedAt: new Date().toISOString(), connectedAt: new Date().toISOString() }));
  }

  protected githubAvailableRepos(projectId: string) {
    return (this.githubAvailable.get(projectId) ?? []).map((repo) => ({ repo, installedAt: new Date().toISOString(), connectedAt: null }));
  }

  /** Moves a repository from the caller's available list to the connected one; false when it is not available. */
  protected connectGithub(projectId: string, repo: string): boolean {
    const available = this.githubAvailable.get(projectId) ?? [];
    if (!available.includes(repo)) return false;
    this.githubAvailable.set(projectId, available.filter((r) => r !== repo));
    this.githubRepos.set(projectId, [...(this.githubRepos.get(projectId) ?? []), repo]);
    return true;
  }

  /** Takes a repository out of the connected list; false when it does not feed the project. */
  protected disconnectGithub(projectId: string, repo: string): boolean {
    const connected = this.githubRepos.get(projectId) ?? [];
    if (!connected.includes(repo)) return false;
    this.githubRepos.set(projectId, connected.filter((r) => r !== repo));
    return true;
  }

  protected count(method: string) {
    this.calls[method] = (this.calls[method] ?? 0) + 1;
    const left = this.failing[method] ?? 0;
    if (left > 0) {
      this.failing[method] = left - 1;
      throw new Error(`${method} failed on purpose (simulateReadFailure).`);
    }
  }

  // ---- change events (officium-api.md §4) --------------------------------------------------

  subscribe(projectId: string, listener: (event: ChangeEvent) => void): () => void {
    let set = this.listeners.get(projectId);
    if (!set) {
      set = new Set();
      this.listeners.set(projectId, set);
    }
    set.add(listener);
    return () => set?.delete(listener);
  }

  protected workingListeners = new Set<(event: ChangeEvent) => void>();

  subscribeWorking(listener: (event: ChangeEvent) => void): () => void {
    this.workingListeners.add(listener);
    return () => this.workingListeners.delete(listener);
  }

  // ---- "Waiting for you" requests (JAVA-1122), kept in `CardRequestStore` ---------------------

  protected readonly requests = new CardRequestStore(
    (projectId, key) => this.findCard(this.requireRecord(projectId), key),
    (projectId, event) => this.emit(projectId, event),
  );

  async listRequests(projectId: string): Promise<CardRequest[]> {
    return this.requests.list(projectId);
  }

  async answerRequest(projectId: string, requestId: string, answer: RequestAnswer, note?: string): Promise<CardRequest> {
    return this.requests.answer(projectId, requestId, answer, note, YOU);
  }

  /** `cards.requestAction`, as an agent: not on the port, only agents (and `mock-test-hooks.ts`) open one. */
  openRequest(...args: Parameters<CardRequestStore["open"]>): CardRequest {
    return this.requests.open(...args);
  }

  closeRequest(...args: Parameters<CardRequestStore["close"]>): void {
    this.requests.close(...args);
  }

  protected emit(projectId: string, partial: Omit<ChangeEvent, "projectId" | "at">) {
    const event: ChangeEvent = { ...partial, projectId, at: now() };
    for (const listener of this.listeners.get(projectId) ?? []) listener(event);
    if (event.type === "card.working") for (const listener of this.workingListeners) listener(event);
  }

  // ---- internals -----------------------------------------------------------------------------

  protected requireRecord(projectId: string): ProjectRecord {
    const record = this.records.get(projectId);
    if (!record) throw new Error("project_not_found");
    return record;
  }

  protected touchCard(card: Card, actor: Actor, entries?: { hours: number }[]) {
    if (entries) card.loggedHours = totalHours(entries);
    card.version += 1;
    card.updatedAt = now();
    card.updatedBy = actor;
  }

  /** `touchCard`, plus a human edit when the writer is a person (`Card.editedBy` in the API). */
  protected editCard(card: Card, actor: Actor) {
    this.touchCard(card, actor);
    if (actor.kind === "person") {
      card.humanEditedAt = card.updatedAt;
      card.humanEditedBy = actor;
      card.humanEditPending = true;
    }
  }

  protected findCard(record: ProjectRecord, keyOrId: string): Card | undefined {
    return record.cards.get(keyOrId) ?? [...record.cards.values()].find((c) => c.key === keyOrId);
  }
}
