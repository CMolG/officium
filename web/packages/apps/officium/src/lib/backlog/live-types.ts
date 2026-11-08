// Live channel wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.
import type { Actor, Card, Project } from "./types";

/**
 * officium-api.md §4 -- one frame per committed change. The memory repository emits these
 * synchronously from `subscribe()`; the real API (JDB-226, `ApiBacklogRepository`) opens the SSE
 * stream at `/officium/v1/projects/{id}/events` behind the exact same method.
 *
 * **Wider than the contract's own list, on purpose (code wins, `.harness/rules/fuente-de-
 * verdad.md`)**: reading `ProjectService`/`CardService` in `javadaba-api/contexts/officium`
 * shows `project.archived`/`project.unarchived` are broadcast as their OWN event types, not
 * folded into `project.updated` the way the contract's prose implies. `Board`'s handler treats
 * every event identically (refetch), so this only matters for anyone pattern-matching `type`.
 */
export type ChangeEventType =
  | "card.created"
  | "card.updated"
  | "card.moved"
  | "card.deleted"
  | "card.executor"
  | "card.link"
  | "card.comment"
  | "card.time"
  | "card.attachment"
  /** A commit, branch or PR naming the card was linked, or its state changed (§8.10). */
  | "card.development"
  | "card.working" | "summons"
  /** An agent opened, or the person answered, or the agent closed, a request for a quick action (JAVA-1122). */
  | "card.request"
  /** The card went into, or out of, someone's agent-window queue (§4.3). */
  | "card.queue"
  | "project.updated"
  | "project.archived"
  | "project.unarchived"
  | "project.machine"
  /** The project's role matrix changed (JAVA-294): any card's `eligibleRoles` may have. */
  | "project.roleMatrix"
  | "member.changed"
  /** A sprint was created, edited, started, completed or deleted (officium-api.md §8.2). Carries
   *  no `cardId`: the sprint list re-reads itself, same "reconnect = refetch" contract as a card. */
  | "sprint.changed"
  /** A documentation page was created, edited or deleted (officium-api.md §8.7). No `cardId`: the
   *  documentation view re-reads its tree and the open page. */
  | "doc.changed"
  /** A comment on a page was added, edited, deleted, resolved or reacted to (JAVA-797). Carries `path`; no version, no text. */
  | "doc.comment"
  /** Someone arrived on a page, left it or changed state (JAVA-802). Carries `path`; no version, no body. */
  | "doc.presence"
  /** A change was recorded in the documentation changelog, marked, or the pipeline token changed
   *  (officium-api.md §8.8). No `cardId`: the changelog and its pending count re-read themselves. */
  | "changelog.changed"
  /** The project's runner recorded a test run (officium-api.md §8.12). No `cardId`: the test
   *  history re-reads itself. */
  | "tests.changed"
  /** One of your autoloops beat in a new state, or an order was queued for it (JAVA-1528). No `cardId`:
   *  the Start/Stop Autoloop button re-reads its status. */
  | "autoloop.changed"
  /** Not a change: the client's own mark that the stream (re)opened -- the server's `ready`
   *  frame. Whatever changed while it was down is caught up from here (JAVA-45). */
  | "stream.ready";

/**
 * Whether a subscription is hearing changes. `reconnecting` while the stream is down and being
 * reopened: what a board shows may be going stale, so it says so. The memory repository never
 * leaves `live`.
 */
export type LiveStatus = "live" | "reconnecting";

/**
 * officium-api.md §4.1 -- an agent actively working on a card right now, with the status lines it
 * reports while it does. Live monitoring only: never part of the card, its `version` or its
 * history, and it expires on the server `expiresAt` if the agent stops reporting.
 */
export interface AgentWork {
  cardId: string;
  cardKey: string;
  actor: Actor;
  startedAt: string;
  updatedAt: string;
  expiresAt: string;
  /** Newest first. */
  statuses: { text: string; at: string }[];
  /** What the agent runs on, as its harness's heartbeat last said (JAVA-584); null until one does. */
  model: string | null;
  effort: string | null;
}

/** officium-api.md §4.1 (JAVA-120): one project's agent work, for a surface with no board loaded --
 *  so each session carries its card. Only projects with work are ever listed. */
export interface ProjectWork {
  project: Project;
  items: { work: AgentWork; card: Card }[];
}

export interface ChangeEvent {
  type: ChangeEventType;
  projectId: string;
  cardId?: string;
  cardKey?: string;
  version?: number;
  /** A documentation event's page (or node) path (JAVA-802). Absent on an older server's. */
  path?: string;
  actor: Actor;
  at: string;
}
