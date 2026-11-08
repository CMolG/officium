import type {
  AgentWork,
  Assignee,
  Attachment,
  MachineStatus,
  AgentWindow,
  QueuedCardEntry,
  Card,
  CardChanges,
  CardDetail,
  CardQuery,
  ChangeEvent,
  ChangelogEntry,
  ChangelogListing,
  ChangelogTokenStatus,
  DocsStatus,
  IssuedChangelogToken,
  HeartbeatDevice,
  IssuedHeartbeatToken,
  DocPage,
  DocHistory,
  DocListState,
  DocPresence,
  DocPresenceState,
  DocNodeInput,
  DocPageSummary,
  DocSettings,
  DocTree,
  DocTreeNode,
  DocUpsertInput,
  Executor,
  Folder,
  GithubRepositories,
  LiveStatus,
  Meta,
  Member,
  Metrics,
  Page,
  CollaboratorQuota,
  Person,
  Project,
  ProjectColor,
  ProjectMeta,
  ProjectWork,
  Role,
  RunState,
  Sprint,
  Team,
  TeamRole,
  Timesheet,
  VersionConflict,
  WriteResult,
} from "./types";
import type { SuiteTrend, TestRun } from "./test-history-types";
import type { CardRequest, RequestAnswer } from "./card-requests";
import type { StorageUsage } from "./storage-usage";
import type { DocNavigationRepository } from "./doc-navigation";
import type { FormLanguageRepository } from "./form-language-repository";
import type { ExecutionModeRepository } from "./execution-mode-repository";
import type { PrecedenceRepository } from "./precedence-repository";
import type { RoleRepository } from "./role-repository";
import type { DocMoveRepository } from "./doc-move-repository";
import type { CardLinkRepository } from "./card-link-repository";
import type { DocSearchRepository } from "./doc-search-repository";
import type { DocCommentsRepository } from "./doc-comments-repository";
import type { DocFilesRepository } from "./doc-files-repository";
import type { DocTemplateRepository } from "./doc-templates-repository";
import type { MoveInput } from "./review-return-types";
import type { OrganizationProfileRepository } from "./organization-profile-repository";
import type { ValueRepository } from "./value-repository";

/**
 * The port the board, the projects home and the "Needs you" lane are written against. Every
 * method mirrors one REST operation of `doc://contracts/officium-api` §3/§5 -- async,
 * `expectedVersion` on every mutation, `WriteResult<T>` for the 409 conflict shape -- so JDB-226
 * only has to write an `ApiBacklogRepository` that calls `fetch`, never touch a component.
 *
 * Grown for JDB-225 (folders/projects/members, card creation) and JDB-239 (executor, links,
 * run-state, needs-human, live updates), then JDB-244 (attachments on the project's machine, the
 * storage allowance). Scope is still the subset of the contract these screens actually call --
 * `backlog.import` has no UI yet and stays out, per invariant 14.
 */
export interface BacklogRepository
  extends CardLinkRepository, DocNavigationRepository, DocMoveRepository, DocSearchRepository, DocFilesRepository, DocTemplateRepository,
    DocCommentsRepository, RoleRepository, FormLanguageRepository, ExecutionModeRepository, PrecedenceRepository, ValueRepository,
    OrganizationProfileRepository {
  /** Whether what it holds outlives the page. Only then may a board keep a local copy of it
   *  (`board-copy.ts`): the in-memory demo starts over on every load, and a copy of its last run
   *  would bring back cards the fresh one never had. */
  readonly persistent: boolean;

  getMeta(): Promise<Meta>;

  // Folders (officium-api.md §3: GET/POST /folders, PATCH/DELETE /folders/{id})
  listFolders(): Promise<Folder[]>;
  createFolder(input: { name: string; parentId?: string | null }): Promise<Folder>;
  updateFolder(id: string, input: { name?: string; parentId?: string | null }): Promise<Folder>;
  /** `409 folder_not_empty` (thrown as an Error with that message) if it still holds projects or
   *  sub-folders. */
  deleteFolder(id: string): Promise<void>;

  // Projects (officium-api.md §3: GET/POST /projects, GET/PATCH /projects/{id}, archive/unarchive)
  listProjects(query?: { folderId?: string | null; archived?: boolean }): Promise<Project[]>;
  getProject(projectId: string): Promise<Project>;
  /** `key_prefix_taken` (409) if another of the caller's projects already owns that prefix.
   *  `icon`/`iconColor` default to `folder-kanban`/`slate` (officium-api.md §8.1) when left out. */
  createProject(
    input: { name: string; keyPrefix: string; folderId?: string | null; icon?: string; iconColor?: ProjectColor },
  ): Promise<Project>;
  /** `icon`/`iconColor` are owner-only (`403 owner_only`, thrown as an Error with that message);
   *  an unknown value throws `invalid_icon` / `invalid_icon_color`. */
  updateProject(
    projectId: string,
    input: {
      expectedVersion: number;
      name?: string;
      folderId?: string | null;
      icon?: string;
      iconColor?: ProjectColor;
    },
  ): Promise<WriteResult<Project>>;
  archiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>>;
  unarchiveProject(projectId: string, expectedVersion: number): Promise<WriteResult<Project>>;
  /** The standing Definition of Done (JAVA-1446). Owner only (`owner_only`); a stale version throws
   *  `version_conflict`, a blank, repeated or over-long item `definition_of_done_invalid`. [] removes it. */
  setDefinitionOfDone(projectId: string, input: { expectedVersion: number; definitionOfDone: string[] }): Promise<Project>;
  /** Deletes the project and everything in it, for everyone (JAVA-1554). Owner only (`403 owner_only`)
   *  and `confirm` must be the project's exact name (`400 confirmation_mismatch`); both throw an
   *  Error with that message. */
  deleteProject(projectId: string, confirm: string): Promise<void>;
  /** The whole backlog as one `.zip` of `<CARD-KEY>.md` files (JAVA-1657), for the project menu's
   *  "Export backlog". Any member may export; `filename` is the one the server named. */
  exportBacklog(projectId: string): Promise<{ blob: Blob; filename: string }>;
  getProjectMeta(projectId: string): Promise<ProjectMeta>;
  // GitHub (officium-api.md §8.10, JAVA-397). Owner only (`403 owner_only`, thrown).
  getGithubRepositories(projectId: string): Promise<GithubRepositories>;
  /** `404 github_repository_not_installed` when GitHub never said this account reaches it;
   *  `409 github_repository_taken` when another project has it. */
  connectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories>;
  disconnectGithubRepository(projectId: string, repo: string): Promise<GithubRepositories>;
  /** Where the browser goes to authorize with GitHub (or install the App), back to the GitHub
   *  settings page; null where there is no GitHub to authorize with (the demo). */
  githubAuthorizeUrl(projectId: string, install: boolean): string | null;

  // Members (officium-api.md §3: GET/POST /projects/{id}/members, PATCH/DELETE .../members/{accountId})
  listMembers(projectId: string): Promise<Member[]>;
  inviteMember(projectId: string, input: { email: string; role: Role }): Promise<Member>;
  updateMemberRole(projectId: string, accountId: string, role: Role): Promise<Member>;
  removeMember(projectId: string, accountId: string): Promise<void>;

  // Cards
  listCards(projectId: string, query?: CardQuery): Promise<Page<Card>>;
  /** The board's catch-up read (JAVA-45): everything it shows, or only what changed `since`. */
  listChanges(projectId: string, since?: string): Promise<CardChanges>;
  getCard(projectId: string, keyOrId: string): Promise<CardDetail>;
  /** `sprintId` left out (or `null`) puts the card in the backlog (officium-api.md §8.2, added
   *  2026-09-24); the Task Board passes the active sprint's id so a card created on the filtered
   *  board stays visible on it. Unknown sprint throws `sprint_not_found`, a closed one
   *  `sprint_closed`. */
  createCard(
    projectId: string,
    input: {
      title: string;
      description?: string;
      actionPlan?: string;
      status?: Card["status"];
      priority?: Card["priority"];
      executor?: Executor;
      category?: Card["category"];
      signals?: Card["signals"];
      subtype?: Card["subtype"];
      estimate?: number;
      epic?: string | null;
      tags?: string[];
      assignees?: Assignee[];
      sprintId?: string | null;
    },
  ): Promise<Card>;

  /** A field left out is left alone; sending what the card already says is not a write (the API
   *  answers the card unchanged, same version), and never counts as a person's edit.
   *  `category: null` takes the card's category away. */
  updateCard(
    projectId: string,
    cardId: string,
    input: {
      expectedVersion: number;
      title?: string;
      description?: string;
      actionPlan?: string;
      priority?: Card["priority"];
      category?: Card["category"];
      signals?: Card["signals"];
      subtype?: Card["subtype"];
      estimate?: number;
      epic?: string | null;
      tags?: string[];
    },
  ): Promise<WriteResult<Card>>;

  /** Status + position in one call -- the fix for JDB-224 item 1: a move always changes both. A move to
   *  `rejected` carries its `rejection` (card://JAVA-1415). */
  moveCard(
    projectId: string,
    cardId: string,
    input: MoveInput,
  ): Promise<WriteResult<Card>>;

  /** Switching to `human` requires `assignee` (`human_card_not_runnable` guards `runState`). */
  setExecutor(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; executor: Executor; assignee?: Assignee },
  ): Promise<WriteResult<Card>>;

  setRunState(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; runState: RunState },
  ): Promise<WriteResult<Card>>;

  changeAssignee(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; assignees: Assignee[] },
  ): Promise<WriteResult<Card>>;

  /** Open `human` cards assigned to the caller (or the whole project when `assigneeMe` is
   *  false) -- the "Needs you" lane, on the board and on the projects home. */
  cardsNeedsHuman(projectId: string, assigneeMe?: boolean): Promise<Card[]>;

  /** officium-api.md §4.1: the cards an agent is actively working on right now. Read-only here --
   *  only agents start/stop a session or report a status (through MCP). */
  listWorking(projectId: string): Promise<AgentWork[]>;
  /** `listWorking` over every project the caller can see, only those with work (JAVA-120). */
  listWorkingEverywhere(): Promise<ProjectWork[]>;

  /** `parentId`: the comment of the same card this one replies to (JAVA-524). */
  addComment(projectId: string, cardId: string, text: string, parentId?: string): Promise<CardDetail>;

  logTime(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; date: string; hours: number; who: string; note?: string },
  ): Promise<WriteResult<CardDetail>>;

  deleteTimeEntry(
    projectId: string,
    cardId: string,
    entryId: string,
    expectedVersion: number,
  ): Promise<WriteResult<CardDetail>>;

  getTimesheet(projectId: string, from: string, to: string): Promise<Timesheet>;

  /**
   * JDB-242/244: attachments live on the project's machine. Uploading sends the file there (peer
   * to peer, or relayed through the API without being stored) and resolves once the machine
   * stored it; opening fetches it back from that machine. Both need a connected machine
   * (`getMachine`) and fail with `machine_offline` otherwise. `onProgress` is 0..100.
   */
  uploadAttachment(
    projectId: string,
    cardId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<CardDetail>;
  openAttachment(
    projectId: string,
    cardId: string,
    attachment: Attachment,
    onProgress?: (percent: number) => void,
  ): Promise<Blob>;
  deleteAttachment(projectId: string, cardId: string, attachmentId: string): Promise<CardDetail>;
  getMachine(projectId: string): Promise<MachineStatus>;

  /** JDB-241: the signed-in account's use of the free allowance of card data. */
  getUsage(): Promise<StorageUsage>;

  // ---- sprints (officium-api.md §8.2, JAVA-53/54) -------------------------------------------

  /** Active first, then planned by `order`, then closed newest first. */
  listSprints(projectId: string, state?: Sprint["state"]): Promise<Sprint[]>;
  /** `name` defaults to `"<KEY> Sprint <n>"`. */
  createSprint(
    projectId: string,
    input?: { name?: string; goal?: string; startDate?: string | null; endDate?: string | null },
  ): Promise<Sprint>;
  updateSprint(
    projectId: string,
    sprintId: string,
    input: {
      expectedVersion: number;
      name?: string;
      goal?: string;
      startDate?: string | null;
      endDate?: string | null;
      order?: number;
    },
  ): Promise<WriteResult<Sprint>>;
  /** `409 sprint_not_planned` if it isn't planned; `409 sprint_already_active` if another sprint
   *  of this project already is. */
  startSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; startDate?: string | null; endDate?: string | null },
  ): Promise<WriteResult<Sprint>>;
  /** `409 sprint_not_active` if it isn't the active one. `moveOpenCardsTo` is required
   *  (`400 move_target_required`): `"backlog"` or a sprint id. Unfinished cards (not
   *  deploy/done) move there; finished ones stay. */
  completeSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; moveOpenCardsTo: string },
  ): Promise<WriteResult<{ sprint: Sprint; moved: string[] }>>;
  /** Only a planned sprint may be deleted (`409 sprint_not_planned`); its cards go back to the
   *  backlog. */
  deleteSprint(projectId: string, sprintId: string, expectedVersion: number): Promise<void>;
  /** Status + position in one call, the sprint's own `moveCard`. `sprintId: null` sends the card
   *  back to the backlog. Unknown sprint `sprint_not_found`, a closed one `sprint_closed`. */
  setCardSprint(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; sprintId: string | null; position: number },
  ): Promise<WriteResult<Card>>;

  // ---- contributions: metrics (officium-api.md §8.3, JAVA-55/56) -----------------------------

  /** Either a date range or a sprint's own period (its `startedAt`..`closedAt`, or to today while
   *  active). Reader access. */
  getMetrics(projectId: string, query: { from: string; to: string } | { sprintId: string }): Promise<Metrics>;

  // ---- organization: people and teams (officium-api.md §8.5, JAVA-57) ------------------------

  /** Everyone with access to a project the caller owns, excluding the caller. */
  listPeople(): Promise<Person[]>;
  /** The caller's collaborators across their projects and the cap they include; `null` when the
   *  demo has nothing to show. A new person past the cap is refused `business_plan_required` (JAVA-1009). */
  getCollaboratorQuota(): Promise<CollaboratorQuota | null>;
  /** The caller's own teams. `404 team_not_found` guards every other team method below for a
   *  team the caller doesn't own. */
  listTeams(): Promise<Team[]>;
  createTeam(input: { name: string; description?: string }): Promise<Team>;
  updateTeam(
    teamId: string,
    input: { expectedVersion: number; name?: string; description?: string },
  ): Promise<WriteResult<Team>>;
  deleteTeam(teamId: string, expectedVersion: number): Promise<void>;
  /** Best-effort directory by email, like project invitation (`account_not_found`,
   *  `ambiguous_account`, thrown as an Error with that message). */
  addTeamMember(teamId: string, email: string): Promise<Team>;
  removeTeamMember(teamId: string, accountId: string): Promise<Team>;
  /** Grants or changes the role; only the team owner's own projects can be granted
   *  (`404 project_not_found` otherwise). */
  grantTeamProject(teamId: string, projectId: string, role: TeamRole): Promise<Team>;
  revokeTeamProject(teamId: string, projectId: string): Promise<Team>;

  // ---- documentation (officium-api.md §8.7, JAVA-130/131) ------------------------------------

  /** Every page, by path, without bodies; `q` searches path, title and body, ignoring case. */
  listDocs(projectId: string, q?: string): Promise<DocPageSummary[]>;
  /** `404 doc_not_found` (thrown as an `ApiError`) when nothing lives at that path. */
  getDoc(projectId: string, path: string): Promise<DocPage>;
  /**
   * Creates the page (no `expectedVersion`, `title` required) or changes it (the version read).
   * A page already at that path, or a stale version, answers the conflict shape with the page as
   * it is now; `invalid_doc_path`, `title_required`, `storage_quota_exceeded` and a version for a
   * page that isn't there (`doc_not_found`) throw. `editSession` groups the autosaves of one
   * editing session (JAVA-796): they keep one history version and one activity entry. `template` and
   * `fromTemplate` make a template or a page from one (JAVA-801), on create only.
   */
  upsertDoc(projectId: string, path: string, input: DocUpsertInput): Promise<WriteResult<DocPage>>;
  /**
   * Moves the page to the trash (JAVA-793): restorable for 30 days, its path free meanwhile. A stale
   * version answers the conflict shape with the page as it is now.
   */
  deleteDoc(projectId: string, path: string, expectedVersion: number): Promise<void | VersionConflict<DocPage>>;
  /**
   * A person's open page says it is there (JAVA-802, §8.19): `client` is a random id per mounted page,
   * and the answer lists everyone on it. Beat again every `beatSeconds` and on a change of state.
   */
  beatDocPresence(projectId: string, path: string, client: string, state: DocPresenceState): Promise<DocPresence>;
  /** Idempotent. `keepalive` lets the request outlive a closing page. */
  leaveDocPresence(projectId: string, path: string, client: string): Promise<void>;
  /** The versions kept of a page (JAVA-794): the heaviest ever plus the two latest previous ones. */
  getDocHistory(projectId: string, path: string): Promise<DocHistory>;
  /** Makes a kept version the page's new current one. A new version, so it is undone by restoring the
   *  version it replaced (`revisionId` of the answer). A stale version answers the conflict shape. */
  restoreDocRevision(projectId: string, path: string, revisionId: string, expectedVersion: number): Promise<WriteResult<DocPage>>;
  /** Final, the heaviest included. `confirm` must be the page's title (`400 confirmation_mismatch`). */
  deleteDocRevision(projectId: string, path: string, revisionId: string, confirm: string): Promise<void>;
  getDocSettings(projectId: string): Promise<DocSettings>;
  /** Owner only (`403 owner_only`); `400 invalid_history_days` outside 0 to 3650. Applies to kept versions at once. */
  updateDocSettings(projectId: string, input: { historyDays: number; expectedVersion?: number }): Promise<DocSettings>;
  /** The lifecycle lists (JAVA-793): your unpublished drafts, the archive, and the trash (`403 read_only` for a viewer). */
  listDocsIn(projectId: string, state: DocListState): Promise<DocPageSummary[]>;
  /** Makes your unpublished draft visible to the project. */
  publishDoc(projectId: string, path: string): Promise<DocPage>;
  /** `409 doc_unpublished` for a draft; an archived page leaves the tree and search but stays readable. */
  archiveDoc(projectId: string, path: string): Promise<DocPage>;
  unarchiveDoc(projectId: string, path: string): Promise<DocPage>;
  /** Brings a trashed page back to its path (`409 doc_path_taken` when a page has taken it since). */
  restoreDoc(projectId: string, id: string): Promise<DocPage>;
  /** Deletes a trashed page for good. */
  purgeDoc(projectId: string, id: string): Promise<void>;

  // ---- the documentation tree's layout (officium-api.md §8.17, JAVA-791) ----------------------

  /** Officium's own pages pinned on top, then the project's collections with their nested nodes. */
  getDocTree(projectId: string): Promise<DocTree>;
  /**
   * Changes one node (editor+). A node with no row (`version` 0) takes `expectedVersion` 0 or none;
   * a first-segment path with no node becomes a collection. A stale version answers the conflict
   * shape with the node as it is now; `invalid_doc_icon`, `invalid_doc_color`, `doc_node_not_found`,
   * `doc_sorted_alphabetically` and `builtin_doc_read_only` throw.
   */
  updateDocNode(projectId: string, path: string, input: DocNodeInput): Promise<WriteResult<DocTreeNode>>;
  /** Only a node with no page and nothing under it (`doc_node_not_empty` throws otherwise). */
  deleteDocNode(projectId: string, path: string, expectedVersion: number): Promise<void | VersionConflict<DocTreeNode>>;

  // ---- documentation changelog (officium-api.md §8.8, JAVA-132) ------------------------------

  /** Newest merge first, filtered by `status` when given; `pendingCount` is always the total. */
  listChangelog(projectId: string, query?: { status?: DocsStatus; limit?: number }): Promise<ChangelogListing>;
  /**
   * Says what the docs did about a change. A stale version answers the conflict shape with the
   * entry as it is now; `pages_required`, `pages_not_allowed` and `unknown_doc_page` throw.
   */
  markChangelogEntry(
    projectId: string,
    entryId: string,
    input: { status: DocsStatus; pages: string[]; expectedVersion: number },
  ): Promise<WriteResult<ChangelogEntry>>;
  getChangelogToken(projectId: string): Promise<ChangelogTokenStatus>;
  /** Owner only (`403 owner_only`). Replaces the previous token, which stops working at once. */
  issueChangelogToken(projectId: string): Promise<IssuedChangelogToken>;
  revokeChangelogToken(projectId: string): Promise<void>;

  // ---- test-run history (officium-api.md §8.12, JAVA-766) ------------------------------------

  /** The project's latest full runs, newest first. The runner records them; the web never does. */
  listTestRuns(projectId: string, query?: { limit?: number }): Promise<TestRun[]>;
  /** Each suite's trend over its last `points` runs, growing ones first. */
  listTestSuites(projectId: string, query?: { suite?: string; points?: number }): Promise<SuiteTrend[]>;

  // ---- agent windows (officium-api.md §4.3, JAVA-561) ------------------------------------------

  /** The signed-in person's own open agent windows, live ones first, each with its queue. */
  listAgentWindows(): Promise<AgentWindow[]>;
  /** Queues the card at the end of one of your windows (`404 session_not_found` for anyone
   *  else's); a card already in another of your queues moves. Agent cards only. */
  queueCard(projectId: string, keyOrId: string, sessionId: string): Promise<QueuedCardEntry>;
  /** Takes the card out of your queue (`404 not_queued` when it is in none of yours). */
  unqueueCard(projectId: string, keyOrId: string): Promise<void>;

  // ---- harness heartbeat (officium-api.md §4.2, JAVA-186/675) ----------------------------------

  /** The signed-in account's devices, the one used most recently first; never a token. */
  listHeartbeatDevices(): Promise<HeartbeatDevice[]>;
  /** A token for a new device; the others keep working. This answer is its only appearance. */
  issueHeartbeatToken(machine: string | null): Promise<IssuedHeartbeatToken>;
  /** Stops that one device (`404 device_not_found` for anything not yours). */
  revokeHeartbeatDevice(id: string): Promise<void>;

  /**
   * officium-api.md §4 (SSE): "reconnect = refetch" -- a subscriber refetches whatever it shows
   * on every event rather than trust the event's own payload. Returns an unsubscribe function.
   * The memory implementation emits synchronously, in-process, after every mutation; JDB-226's
   * `ApiBacklogRepository` opens the real `GET /projects/{id}/events` stream behind the exact
   * same method, so no component changes when that lands.
   *
   * `onStatus` hears the stream drop and come back; a subscriber that shows data says so while
   * it is down. The memory implementation never calls it.
   *
   * The page's FIRST `stream.ready` is the stream opening, not a reconnect: a subscriber that
   * joined moments before it loaded what it shows and does not get it (JAVA-1646). A `stream.ready`
   * after any drop, and after a failed connect, reaches everyone.
   */
  subscribe(
    projectId: string,
    listener: (event: ChangeEvent) => void,
    onStatus?: (status: LiveStatus) => void,
  ): () => void;

  /** `card.working` from every project the caller can see, on ONE stream (`GET /working/events`,
   *  JAVA-120), plus `stream.ready` on each (re)connection -- same "reconnect = refetch" rule. */
  subscribeWorking(listener: (event: ChangeEvent) => void, onStatus?: (status: LiveStatus) => void): () => void;

  /** The project's live requests (JAVA-1122): open, or answered and not yet closed by the agent. Oldest first. */
  listRequests(projectId: string): Promise<CardRequest[]>;
  /** The person answers one. Rejects with `request_not_open` when someone already did. */
  answerRequest(projectId: string, requestId: string, answer: RequestAnswer, note?: string): Promise<CardRequest>;
}
