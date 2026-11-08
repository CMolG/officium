import type { Phase, RunConfig } from "./role-matrix-types";
import type { DocMoveResult, DocTreeNode } from "./doc-types";
import type { ReviewReturn, ReviewReturnReasonEntry } from "./review-return-types";
import type { EscapedDefect, LineageView, ReviewOutcome } from "./quality-lineage";
import type { CheckpointProgress } from "./checkpoints";
import type { CardPrecedence } from "./precedence";

/**
 * Domain shapes for Officium's backlog, copied field-for-field from
 * `doc://contracts/officium-api` §2. This is what makes JDB-226 a swap of
 * `BacklogRepository`'s implementation and not a rewrite of the UI: every component in
 * `src/components/backlog` is written against these types, never against the in-memory
 * repository's internals.
 *
 * Provenance (`.harness/rules/external-providers.md`, recorded in full in
 * `doc://history/plans/2026-09-14-officium-programa` §5): the shape of `Card`/`CardDetail` and the
 * state/priority vocabulary are adapted from the concept's `src/lib/backlog-data.ts` --
 * rewritten here, not copied, and extended with the fields the concept never had (`projectId`,
 * `key`, `version`, `runState`, `executor`, links, actors) because it had no backend and no
 * notion of a project.
 */

/** The six board columns, then the two with no column: `done`, Completed (user decision,
 *  2026-09-23), and `rejected`, a discarded card kept with its reason (card://JAVA-1415). */
export type Status = "refine" | "todo" | "doing" | "ready" | "review" | "deploy" | "done" | "rejected";
/** Why a card was rejected: the closed list `meta.states` serves as `rejectionReasons`. */
export type RejectionReason = "not-needed" | "duplicate" | "superseded" | "wrong-split" | "infeasible" | "other";
/** A rejected card's reason: `label` is the reason as a person reads it, `card` the key it names. */
export interface CardRejection {
  reason: RejectionReason;
  label: string;
  note: string;
  card: string | null;
}
/** One reason of the closed list; `namesCard`: a rejection for it must name the card it points to. */
export interface RejectionReasonEntry {
  id: RejectionReason;
  label: string;
  hint: string;
  namesCard: boolean;
}
export type Priority = "superHigh" | "high" | "medium" | "low" | "superLow";
/** What kind of work a card is (JAVA-28): the user's fifteen, in their four groups. */
export type Category =
  | "epic" | "feature" | "userStory" | "enhancement"
  | "bug" | "hotfix" | "regression"
  | "refactor" | "technicalDebt" | "infrastructure" | "security"
  | "spike" | "testing" | "routine" | "documentation";
/** What about a card's work brings roles its category alone does not (JAVA-294). */
export type Signal =
  | "touches-auth-permissions-or-personal-data"
  | "touches-ui"
  | "touches-hot-paths-or-heavy-queries"
  | "touches-data-schema"
  | "touches-infrastructure";
/** Which of the spike contract's two subtypes a spike is (JAVA-391); it picks the spike's roles. */
export type SpikeSubtype = "technical" | "ux-ui";
export type RunState = "idle" | "running" | "completed" | "failed";
export type Executor = "ai" | "human";
export type Role = "owner" | "editor" | "viewer";

export interface Actor {
  kind: "person" | "agent";
  accountId: string;
  name: string;
  agentName: string | null;
  /** The computer an agent said it runs on (JAVA-200); never set for a person. */
  machine?: string | null;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** A closed palette (officium-api.md §8.1): never a free hex, so every color can be checked for
 *  contrast once, in the app's tokens. The icon, not the color, is what tells two projects apart. */
export type ProjectColor =
  | "slate" | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "indigo" | "violet" | "pink";

export interface Project {
  id: string;
  folderId: string | null;
  name: string;
  /** `^[A-Z][A-Z0-9]{1,9}$` -- prefixes every card key ("OFF-12"). */
  keyPrefix: string;
  /** The caller's role on this project. */
  role: Role;
  /** Lucide icon name (`^[a-z0-9-]{1,40}$`). Default `folder-kanban`. Only the owner may change
   *  it or `iconColor` (`403 owner_only`) -- how the owner tells their own projects apart, not
   *  card content. */
  icon: string;
  iconColor: ProjectColor;
  archivedAt: string | null;
  /** The language codes every form on a human card of this project is written in (JAVA-1082). `[]` = no requirement;
   *  the first is the default. Only the owner changes it. */
  formLanguages: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  /** The standing Definition of Done every agent answers when it finishes a card (JAVA-1446); [] = none. */
  definitionOfDone: string[];
  /** The most tokens the work rules may take together (JAVA-1778); the API serves it, so no client hardcodes it. */
  definitionOfDoneTokenQuota: number;
  /** A protected project can never be deleted and its owner never changes (JAVA-1853). Read-only: a migration sets
   *  it, so no request carries it. */
  protected: boolean;
}

export interface Member {
  accountId: string;
  email: string;
  name: string;
  role: Role;
  /** How the role was granted (officium-api.md §8.5): directly, or through a team. */
  via: "direct" | "team";
  teamId: string | null;
  createdAt: string;
}

/** A real account or a free-text name -- v1 lets a project assign work to either. */
export interface Assignee {
  accountId: string | null;
  name: string;
}

/** A card's own workflow (JAVA-1591): the role and mods of each phase it names (`CardWorkflow` on the server). */
export interface CardWorkflow {
  version: number;
  phases: Partial<Record<Phase, { role: string; mods: string[] }>>;
  /** On an epic, written once for all its cards (JAVA-1885): by matrix row (`feature`, `spike/ux-ui`), each phase's pick. */
  cards?: Partial<Record<string, Partial<Record<Phase, { role: string; mods: string[] }>>>>;
}

/** One way the stored workflow no longer fits its card (JAVA-1592), as `CardWorkflow.Problem` on the server. */
export interface WorkflowProblem {
  phase: string;
  message: string;
}

export interface Card {
  /** The sum of the card's time entries, 0 with none (JAVA-1376): the board reads no timesheet. */
  loggedHours: number;
  id: string;
  projectId: string;
  /** "OFF-12" -- sequential per project, never reused. */
  key: string;
  number: number;
  title: string;
  /** Markdown: what the card is. */
  description: string;
  /** Markdown: how it will be tackled, written by whoever picks it up -- a person or an agent. */
  actionPlan: string;
  /** Derived from `description` as plain text -- the board's card face never shows raw Markdown. */
  excerpt: string;
  status: Status;
  runState: RunState;
  priority: Priority;
  executor: Executor;
  /** Null until someone says what kind of work it is. */
  category: Category | null;
  /** In the server's order; a person or the classifier (JAVA-373) sets them. */
  signals: Signal[];
  /** A spike's subtype, `technical` unless someone says otherwise; null off a spike (JAVA-391). */
  subtype: SpikeSubtype | null;
  /** Fluxor role ids that may work the card now: its category's for the phase its status is in (a
   *  ux-ui spike's own row), plus its signals', under the project's role matrix (JAVA-294). Computed
   *  by the server. */
  eligibleRoles: string[];
  /** The model and effort the card's category cell is worked with in its phase (JAVA-915); null
   *  once done or with no category. Computed by the server. */
  runConfig: RunConfig | null;
  /** Each eligible role's model and effort: its override in that cell, else the cell's. */
  runConfigs: Record<string, RunConfig>;
  /** Each eligible role's mods (card://JAVA-1569): the ones its sheet requires, then the matrix's cell and signal
   *  mods, each once; a role with none is absent. Computed by the server. */
  mods: Record<string, string[]>;
  /** The workflow that governs the card: its own (JAVA-1591) or its epic's part (JAVA-1885); null until one is written. */
  workflow?: CardWorkflow | null;
  /** What is wrong with the stored workflow now (JAVA-1592), empty when it is valid or absent. Computed by the server. */
  workflowProblems?: WorkflowProblem[];
  /** The epic whose workflow governs the card (JAVA-1885), its part for the card's row; null when its own does. */
  workflowFrom?: string | null;
  /** An epic's checkpoints completed of its total, its face's "N/M" (card://JAVA-1873); null or absent on any other card. */
  checkpointProgress?: CheckpointProgress | null;
  /** Why a person's card waits, from the project's closed list (Off-Vocab, "Wake reason"); null or absent on any other card.
   *  TODO(backend): the API serves no wake reasons yet (Configuration · Wake reasons, JAVA-1827); the face draws the mark the day it does. */
  wakeReason?: string | null;
  /** The rule that ranks the card, or null when none does (JAVA-1686). Computed by the server. */
  precedence?: CardPrecedence | null;
  /** Dense `0..n-1` within `(project, status)`. */
  order: number;
  /** Hours. */
  estimate: number;
  epic: string | null;
  tags: string[];
  assignees: Assignee[];
  /** Card keys, symmetric. */
  related: string[];
  /** Card keys this card blocks now (open blocker only). */
  blocks: string[];
  /** Card keys blocking this card now: a blocker in `deploy` or `done` moves to `relatedBy`. */
  /** Also, `relatedBy`: cards joined by a `blocks` link whose blocker finished, with the direction
   *  (`blockedThis`: that card was the blocker; `blockedByThis`: this card was). JAVA-1114. */
  blockedBy: string[]; relatedBy: { key: string; direction: "blockedThis" | "blockedByThis" }[];
  /** True while `blockedBy` is not empty. */
  blocked: boolean;
  /** Why a rejected card was rejected (card://JAVA-1415); null or absent on every other card. */
  rejection?: CardRejection | null;
  /** Each time the card was sent back from review or deploy, oldest first (card://JAVA-1416); absent counts as none. */
  reviewReturns?: ReviewReturn[];
  /** The lineage a corrective card's description states (card://JAVA-1525); null or absent when none. */
  lineage?: LineageView | null;
  /** The defects that escaped this card's delivery, oldest first; `qualityRegressionTriggered` while any. */
  escapedDefects?: EscapedDefect[];
  qualityRegressionTriggered?: boolean;
  /** Each exit from review, oldest first (card://JAVA-1526); absent counts as none. */
  reviewOutcomes?: ReviewOutcome[];
  /** The sprint it's planned in (officium-api.md §8.2); `null` = the backlog. */
  sprintId: string | null;
  /** Dense `0..n-1` position inside its sprint or the backlog, per `(project, sprintId)`. */
  rank: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: Actor;
  updatedBy: Actor;
  /**
   * The last time a PERSON changed what the card says (fields, comments, attachments) -- never
   * set by an agent, never by a save that changed nothing. `humanEditPending` stays true until an
   * agent acknowledges it (`cards.acknowledgeHumanEdit`): it is how an agent finds the cards a
   * person answered.
   */
  humanEditedAt: string | null;
  humanEditedBy: Actor | null;
  humanEditReviewedAt: string | null;
  humanEditPending: boolean;
  /**
   * How many questions the card's Quaestio form asks (JAVA-890); null or absent while it has none.
   * Only a human card carries one. It is on the list view too, so "Needs you" can offer "Answer (N
   * questions)" without opening every card for its `form`.
   */
  formQuestions?: number | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * `GET …/cards/changes` (JAVA-45): what a board holding a copy needs to catch up. Without `since`,
 * every card the board shows; with it, every card whose face changed after it -- whatever its
 * status, so one moved to Completed can leave the board -- and the ids deleted meanwhile. `asOf` is
 * the server's clock, the `since` of the next call.
 */
export interface CardChanges {
  asOf: string;
  cards: Omit<Card, "description" | "actionPlan">[];
  removed: string[];
}

export interface ProjectMeta {
  epics: string[];
  tags: string[];
  assignees: Assignee[];
}

export interface Meta {
  statuses: Status[];
  priorities: Priority[];
  runStates: RunState[];
  executors: Executor[];
  categories: Category[];
  categoryGuide: CategoryGuideEntry[];
  signals: Signal[];
  rejectionReasons: RejectionReasonEntry[];
  /** Whether this deployment accepts a move to rejected yet; false hides the Reject action. */
  rejectionEnabled: boolean;
  /** Why a card may be sent back, the closed list (card://JAVA-1416); absent on a server that predates it. */
  reviewReturnReasons?: ReviewReturnReasonEntry[];
}

/** What a category means (JAVA-293): a picker's one line, and the Markdown with its rules. */
export interface CategoryGuideEntry {
  id: Category;
  hint: string;
  description: string;
}

export type { TimeEntry, Timesheet } from "./time-types";
export type { ModSheet, ModSummary, RoleSheet, RoleSummary } from "./mod-types";
export type { Effort, Phase, RoleMatrix, RoleMatrixRow, RoleMatrixView, RunCell, RunConfig, RunRow } from "./role-matrix-types";

/** `409 {error:"version_conflict", message, current}` -- officium-api.md §1.3. */
export interface VersionConflict<T> {
  error: "version_conflict";
  message: string;
  current: T;
}

export type WriteResult<T> = T | VersionConflict<T>;

/** A move answers the moved node's conflict (its version), not the move's result. */
export function isMoveConflict(result: DocMoveResult | VersionConflict<DocTreeNode>): result is VersionConflict<DocTreeNode> {
  return "error" in result;
}

export function isConflict<T>(result: WriteResult<T>): result is VersionConflict<T> {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    (result as { error: unknown }).error === "version_conflict"
  );
}

export interface CardQuery {
  q?: string;
  status?: Status[];
  priority?: Priority[];
  epic?: string;
  tag?: string;
  assignee?: string;
  executor?: Executor;
  category?: Category;
  blocked?: boolean;
  humanEditPending?: boolean;
  /** A sprint id, `"active"` or `"backlog"` (officium-api.md §8.2). */
  sprint?: string;
  /** Only the cards rejected for this reason (card://JAVA-1415). */
  rejection?: RejectionReason;
  /** Only the cards one role may take: its id as a card's `eligibleRoles` lists it (JAVA-535). */
  role?: string;
  sort?: "order" | "priority" | "updated" | "created";
  /**
   * An OQL query (`lib/backlog/jql.ts`, JDB-270): evaluated on the server, over the whole
   * project, instead of the flat filters above -- the two are alternative search modes, never
   * combined. A query that fails to parse throws an `ApiError` with code `jql_invalid` (the
   * message and `at` the search view already showed when this ran in the browser).
   */
  jql?: string;
  /** The `nextCursor` of the previous page. */
  cursor?: string;
  /** Page size; the API defaults to 50. */
  limit?: number;
}

export type { MoveInput, ReviewReturn, ReviewReturnInput, ReviewReturnMetrics, ReviewReturnReason, ReviewReturnReasonEntry } from "./review-return-types";
export type { FormAnswer, CardForm, Comment, Attachment, CardDetail, Activity } from "./card-detail-types";
export type { DevLink, GithubRepository, GithubRepositories } from "./github-types";
export type { AgentWindowState, AgentWindowTelemetry, QueuedCardEntry, AgentWindow, MachineStatus, HeartbeatDevice, IssuedHeartbeatToken } from "./agent-window-types";
export type { ChangeEventType, LiveStatus, AgentWork, ProjectWork, ChangeEvent } from "./live-types";
export type { DocCommentEntry, DocCommentInput, DocCommentState, DocQuote, DocReaction, DocReactor, DocThread } from "./doc-comment-types";
export type { DocBacklinks, DocFile, DocHistory, DocListState, DocMoveInput, DocMoveResult, DocMovedPage, DocSearchFilters, DocSearchPart, DocSearchRange, DocSearchResult, DocSearchState, DocNodeInput, DocPage, DocPageSummary, DocTemplate, DocUpsertInput, DocPresence, DocPresencePerson, DocPresenceState, DocRecent, DocRevision, DocSettings, DocSortMode, DocStar, DocStarInput, DocStorageFigures, DocTree, DocTreeNode, DocsStatus, ChangelogEntry, ChangelogListing, ChangelogTokenStatus, IssuedChangelogToken } from "./doc-types";
export type { SprintState, Sprint } from "./sprint-types";
export type { MetricsPeriod, TokenCounts, ContributionMetric, CategoryMetric, LongestOpenCard, Metrics, RejectedMetrics } from "./metrics-types";
export type { Nicknames, OrganizationProfile, TeamRole, TeamMember, TeamProjectGrant, Team, PersonProject, Person, CollaboratorQuota } from "./people-types";
