// Agent window wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.

/** officium-api.md §4.3 (JAVA-561): one of YOUR open agent windows, as its waiter reports it.
 *  `blocked` (JAVA-562): working or idle, but stopped at a prompt only its person can answer. */
export type AgentWindowState = "blocked" | "working" | "idle" | "offline";

/** JAVA-562: what the window's status line last reported. Any field may be missing: Claude Code
 *  leaves some out until its first answer, and the limits exist only on some plans. */
export interface AgentWindowTelemetry {
  contextUsedPercent?: number | null;
  contextInputTokens?: number | null;
  contextWindowSize?: number | null;
  modelId?: string | null;
  modelName?: string | null;
  effort?: string | null;
  thinking?: boolean | null;
  fastMode?: boolean | null;
  costUsd?: number | null;
  durationMs?: number | null;
  apiDurationMs?: number | null;
  linesAdded?: number | null;
  linesRemoved?: number | null;
  /** The ACCOUNT's limits, the same in every window of it. */
  fiveHourUsedPercent?: number | null;
  fiveHourResetsAt?: string | null;
  sevenDayUsedPercent?: number | null;
  sevenDayResetsAt?: string | null;
  sessionName?: string | null;
  projectDir?: string | null;
  gitWorktree?: string | null;
  repo?: string | null;
  prNumber?: number | null;
  prUrl?: string | null;
  version?: string | null;
  reportedAt: string;
}

/** A card queued into one of your agent windows. `delivered`: its waiter holds it, unconfirmed. */
export interface QueuedCardEntry {
  cardId: string;
  cardKey: string;
  projectId: string;
  sessionId: string;
  position: number;
  queuedAt: string;
  delivered: boolean;
}

export interface AgentWindow {
  sessionId: string;
  /** What the window calls itself (its working directory's name), when it said. */
  label: string | null;
  machine: string | null;
  state: AgentWindowState;
  registeredAt: string | null;
  lastSeenAt: string | null;
  /** The card it was last handed, while it works it. */
  currentCard: { cardId: string; cardKey: string; projectId: string; deliveredAt: string } | null;
  cardsWorked: number;
  /** In the order the window takes them. */
  queue: QueuedCardEntry[];
  /** While `blocked`: `permission_prompt` or `elicitation_dialog`. */
  blockedReason: string | null;
  /** Null until the window's status line reports (JAVA-562). */
  telemetry: AgentWindowTelemetry | null;
}

/** Is a machine hosting the project's attachments right now (`GET …/machine`, JDB-242)? */
export interface MachineStatus {
  connected: boolean;
  /** The agent that connected it, e.g. "claude-code". */
  label: string | null;
  connectedAt: string | null;
}

/** One machine whose harness beats for its agents (officium-api.md §4.2, JAVA-186/675). Never its token. */
export interface HeartbeatDevice {
  id: string;
  /** The machine it was set up on; null for a token created without a name. */
  machine: string | null;
  createdAt: string;
  /** Its last beat, to the minute; null when it never beat. */
  lastUsedAt: string | null;
}

/** A new device's token: this answer is the only place it ever appears. */
export interface IssuedHeartbeatToken {
  id: string;
  machine: string | null;
  token: string;
  createdAt: string;
}
