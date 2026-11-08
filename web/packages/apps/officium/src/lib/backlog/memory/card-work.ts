import type {
  Actor,
  AgentWork,
  Assignee,
  AgentWindow,
  AgentWindowState,
  AgentWindowTelemetry,
  QueuedCardEntry,
  Card,
  HeartbeatDevice,
  IssuedHeartbeatToken,
  Executor,
  ProjectWork,
  RunState,
  WriteResult,
} from "../types";
import { newId } from "../format";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { EPIC_NOT_WORKABLE, now } from "./rules";
import { SEED_AGENT } from "./sample-record";
import { MemoryCardWorkflow } from "./card-workflow";

export class MemoryCardWork extends MemoryCardWorkflow {
  /**
   * officium-api.md §4.1 on the demo board: two of the AI cards in progress are being worked on
   * by an agent right now, each with a few status lines, so the snake border, the floating list
   * and the modal's live status are visible without an agent connected. Oldest line first here;
   * the session stores them newest first, like the server.
   */
  protected seedAgentWork(projectId: string) {
    const record = this.requireRecord(projectId);
    // OFF-101's harness says what it runs on (JAVA-584); OFF-112's has not said yet.
    const seeds: { key: string; lines: string[]; model?: string; effort?: string }[] = [
      {
        key: "OFF-101", lines: ["Reading the current MySQL schema", "Writing the migration for the orders table"],
        model: "claude-opus-5-5", effort: "high",
      },
      { key: "OFF-112", lines: ["Reproducing the flaky checkout test locally", "Running the checkout suite 20 times"] },
    ];
    const sessions = new Map<string, AgentWork>();
    for (const seed of seeds) {
      const card = this.findCard(record, seed.key);
      if (!card) continue;
      const session = this.beat(sessions, card, SEED_AGENT);
      session.statuses = seed.lines.map((text) => ({ text, at: session.updatedAt })).reverse();
      session.model = seed.model ?? null;
      session.effort = seed.effort ?? null;
    }
    this.working.set(projectId, sessions);
  }

  async setExecutor(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; executor: Executor; assignee?: Assignee },
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    card.executor = input.executor;
    if (input.executor === "human") {
      // human_card_not_runnable: idle forever, and always at least one assignee.
      card.runState = "idle";
      if (input.assignee) card.assignees = [input.assignee];
      else if (card.assignees.length === 0) {
        const owner = [...record.members.values()].find((m) => m.role === "owner");
        card.assignees = [{ accountId: owner?.accountId ?? YOU.accountId, name: owner?.name ?? YOU.name }];
      }
    }
    this.touchCard(card, actor);
    this.emit(projectId, { type: "card.executor", cardId: card.id, cardKey: card.key, version: card.version, actor });
    return { ...card };
  }

  async setRunState(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; runState: RunState },
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.executor === "human") throw new Error("human_card_not_runnable");
    if (card.category === "epic" && input.runState === "running") {
      throw new ApiError("epic_not_workable", EPIC_NOT_WORKABLE, 409);
    }
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    card.runState = input.runState;
    this.touchCard(card, YOU);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card };
  }

  async listWorking(projectId: string): Promise<AgentWork[]> {
    const sessions = [...(this.working.get(projectId)?.values() ?? [])];
    return sessions
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map((w) => ({ ...w, statuses: [...w.statuses] }));
  }

  async listWorkingEverywhere(): Promise<ProjectWork[]> {
    const result: ProjectWork[] = [];
    for (const project of await this.listProjects({ archived: true })) {
      const record = this.requireRecord(project.id);
      const items = (await this.listWorking(project.id)).flatMap((work) => {
        const card = this.findCard(record, work.cardId);
        return card ? [{ work, card: { ...card } }] : [];
      });
      if (items.length > 0) result.push({ project, items });
    }
    return result;
  }

  /** `cards.setActivelyWorking` -- not on `BacklogRepository`: no screen calls it, only agents
   *  (and `mock-test-hooks.ts`, which plays one). */
  async setActivelyWorking(projectId: string, keyOrId: string, activelyWorking: boolean, actor: Actor): Promise<void> {
    const card = this.requireRunnableCard(projectId, keyOrId);
    const sessions = this.working.get(projectId) ?? new Map<string, AgentWork>();
    this.working.set(projectId, sessions);
    if (!activelyWorking) {
      if (!sessions.delete(card.id)) return;
    } else {
      if (card.category === "epic") throw new ApiError("epic_not_workable", EPIC_NOT_WORKABLE, 409);
      this.beat(sessions, card, actor);
    }
    this.emit(projectId, { type: "card.working", cardId: card.id, cardKey: card.key, actor });
  }

  /** `cards.reportStatus` -- newest first, capped like the server (50 lines). */
  async reportStatus(projectId: string, keyOrId: string, text: string, actor: Actor): Promise<void> {
    const card = this.requireRunnableCard(projectId, keyOrId);
    if (card.category === "epic") throw new ApiError("epic_not_workable", EPIC_NOT_WORKABLE, 409);
    const sessions = this.working.get(projectId) ?? new Map<string, AgentWork>();
    this.working.set(projectId, sessions);
    const session = this.beat(sessions, card, actor);
    session.statuses = [{ text: text.trim(), at: session.updatedAt }, ...session.statuses].slice(0, 50);
    this.emit(projectId, { type: "card.working", cardId: card.id, cardKey: card.key, actor });
  }

  protected requireRunnableCard(projectId: string, keyOrId: string): Card {
    const card = this.findCard(this.requireRecord(projectId), keyOrId);
    if (!card) throw new Error("card_not_found");
    if (card.executor === "human") throw new Error("human_card_not_runnable");
    return card;
  }

  protected beat(sessions: Map<string, AgentWork>, card: Card, actor: Actor): AgentWork {
    const at = now();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const session = sessions.get(card.id) ?? {
      cardId: card.id, cardKey: card.key, actor, startedAt: at, updatedAt: at, expiresAt, statuses: [], model: null, effort: null,
    };
    Object.assign(session, { actor, updatedAt: at, expiresAt });
    sessions.set(card.id, session);
    return session;
  }

  async changeAssignee(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; assignees: Assignee[] },
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    const same = (a: Assignee[], b: Assignee[]) =>
      a.length === b.length && a.every((x, i) => x.name === b[i]?.name && x.accountId === b[i]?.accountId);
    if (same(card.assignees, input.assignees)) return { ...card };
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    card.assignees = input.assignees;
    this.editCard(card, YOU);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card };
  }

  protected readonly agentWindows = new Map<string, AgentWindow>();

  /** Test hook's lever (`simulateAgentWindow`): a window registering, or its state changing. */
  setAgentWindow(sessionId: string, label: string, state: AgentWindowState,
    report: { telemetry?: Omit<AgentWindowTelemetry, "reportedAt">; blockedReason?: string } = {}) {
    const at = now();
    const existing = this.agentWindows.get(sessionId);
    this.agentWindows.set(sessionId, {
      sessionId, label, machine: "MOCK", state, registeredAt: existing?.registeredAt ?? at, lastSeenAt: at,
      currentCard: existing?.currentCard ?? null, cardsWorked: existing?.cardsWorked ?? 0, queue: existing?.queue ?? [],
      blockedReason: state === "blocked" ? (report.blockedReason ?? "permission_prompt") : null,
      telemetry: report.telemetry ? { ...report.telemetry, reportedAt: at } : (existing?.telemetry ?? null),
    });
  }

  async listAgentWindows(): Promise<AgentWindow[]> {
    const order: AgentWindowState[] = ["blocked", "working", "idle", "offline"];
    return [...this.agentWindows.values()]
      .sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))
      .map((w) => ({ ...w, queue: w.queue.map((entry) => ({ ...entry })) }));
  }

  async queueCard(projectId: string, keyOrId: string, sessionId: string): Promise<QueuedCardEntry> {
    const record = this.requireRecord(projectId);
    if (record.project.role === "viewer") throw new ApiError("read_only", "Viewers cannot write to this project", 403);
    const card = this.findCard(record, keyOrId);
    if (!card) throw new ApiError("card_not_found", "No such card", 404);
    if (card.executor === "human") throw new ApiError("human_card_not_runnable", "A human card is never run by an agent", 400);
    if (card.category === "epic") throw new ApiError("epic_not_workable", "An epic groups cards and is never worked itself", 409);
    if (card.status === "done") throw new ApiError("card_done", "A Completed card is not worked again: move it back to a column first", 409);
    if (card.status === "rejected") throw new ApiError("card_rejected", "A rejected card is not worked: reopen it in refine first", 409);
    const window = this.agentWindows.get(sessionId);
    if (!window) throw new ApiError("session_not_found", "No such agent window of yours", 404);
    for (const w of this.agentWindows.values()) w.queue = w.queue.filter((entry) => entry.cardId !== card.id);
    const entry: QueuedCardEntry = {
      cardId: card.id, cardKey: card.key, projectId, sessionId,
      position: Math.max(0, ...window.queue.map((e) => e.position)) + 1, queuedAt: now(), delivered: false,
    };
    window.queue.push(entry);
    this.emit(projectId, { type: "card.queue", cardId: card.id, cardKey: card.key, actor: YOU });
    return { ...entry };
  }

  async unqueueCard(projectId: string, keyOrId: string): Promise<void> {
    const card = this.findCard(this.requireRecord(projectId), keyOrId);
    const window = card && [...this.agentWindows.values()].find((w) => w.queue.some((e) => e.cardId === card.id));
    if (!card || !window) throw new ApiError("not_queued", "This card is in none of your queues", 404);
    window.queue = window.queue.filter((e) => e.cardId !== card.id);
    this.emit(projectId, { type: "card.queue", cardId: card.id, cardKey: card.key, actor: YOU });
  }

  /** The account's heartbeat devices (§4.2): one token each, never kept here once issued. */
  protected heartbeatDevices: HeartbeatDevice[] = [];

  async listHeartbeatDevices(): Promise<HeartbeatDevice[]> {
    return this.heartbeatDevices.map((device) => ({ ...device }));
  }

  async issueHeartbeatToken(machine: string | null): Promise<IssuedHeartbeatToken> {
    const device: HeartbeatDevice = { id: newId("device"), machine: machine?.trim() || null, createdAt: now(), lastUsedAt: null };
    this.heartbeatDevices = [device, ...this.heartbeatDevices];
    const token = `ofhb_${newId("tok").replace(/[^a-z0-9]/gi, "")}${Date.now().toString(16)}`;
    return { id: device.id, machine: device.machine, token, createdAt: device.createdAt };
  }

  async revokeHeartbeatDevice(id: string): Promise<void> {
    if (!this.heartbeatDevices.some((device) => device.id === id)) {
      throw new ApiError("device_not_found", "No device of yours has that id", 404);
    }
    this.heartbeatDevices = this.heartbeatDevices.filter((device) => device.id !== id);
  }
}
