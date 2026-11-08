"use client";

import { getSharedBacklogRepository } from "./memory-repository";
import type { CardRequest } from "./card-requests";
import { autoloopMockHooks, type AutoloopMockHooks } from "./mock-autoloop-hooks";
import { docMockHooks } from "./mock-doc-hooks";
import { profileMockHooks, type ProfileMockHooks } from "./mock-profile-hooks";
import { presenceMockHooks } from "./mock-presence-hooks";
import type { CardPrecedence } from "./precedence";
import { requestMockHooks } from "./mock-request-hooks";
import { cardAgentMockHooks } from "./mock-card-agent-hooks";
import {
  isConflict,
  type Actor,
  type AgentWindowTelemetry,
  type Card,
  type Category,
  type CollaboratorQuota,
  type DocCommentInput,
  type DocPage,
  type DocPresence,
  type CardWorkflow,
  type DocUpsertInput,
  type FormAnswer,
  type ProjectColor,
  type Role,
  type RoleMatrix,
  type RoleMatrixView,
  type DocThread,
  type Status,
} from "./types";

/**
 * JDB-239's own directive: "write [the live-update tests] against the in-memory repository
 * driven from the test... a test-only hook that performs the 'agent' write through the
 * repository and emits the same change notification the SSE client will emit later."
 *
 * This is exactly that hook, nothing more: it calls the SAME `BacklogRepository` methods a real
 * MCP tool call would (`cards.requestHuman` -> `createCard` + `linkCard`), attributed to an
 * `agent` actor instead of the signed-in person, so `Board`'s `subscribe()`-driven refresh and
 * the "Needs you" lane can be proven live, end to end, without a real MCP server.
 *
 * **Debt, on purpose**: this whole module disappears the day JDB-226 swaps in the real API --
 * at that point "an agent write" is a real `POST /officium/mcp` call from a real MCP client, and
 * there is nothing left to simulate. It is only ever installed on `window`, never imported by a
 * component, so nothing in the render path depends on it.
 */

const AGENT: Actor = { kind: "agent", accountId: "acc-you", name: "You", agentName: "claude-code" };

export interface OfficiumMockHooks extends ProfileMockHooks, AutoloopMockHooks {
  /** Mirrors `cards.requestHuman` (officium-api.md §5): creates a `human` card as an agent and
   *  links it as blocking each key in `unblocks`. */
  simulateAgentRequestHuman(
    projectId: string,
    input: { title: string; why: string; steps: string; doneWhen: string; unblocks: string[] },
  ): Promise<Card>;
  /** Mirrors `cards.setActivelyWorking` (officium-api.md §5), as an agent. */
  simulateAgentWorking(projectId: string, cardKey: string, activelyWorking: boolean): Promise<void>;
  /** Mirrors `cards.reportStatus` (officium-api.md §5), as an agent. */
  simulateAgentStatus(projectId: string, cardKey: string, text: string): Promise<void>;
  /** The project's machine going away or coming back (JDB-244): what `officium-files` stopping
   *  or reconnecting looks like to the board. */
  simulateMachine(projectId: string, online: boolean): void;
  /** One of your agent windows registering or changing state (JAVA-561): what a Claude Code
   *  window with its Officium waiter looks like to the board, with the cards queued into it, and
   *  what its status line reported (JAVA-562). */
  simulateAgentWindow(
    sessionId: string,
    label: string,
    state: "blocked" | "working" | "idle" | "offline",
    queued?: { projectId: string; cardKey: string }[],
    report?: { telemetry?: Omit<AgentWindowTelemetry, "reportedAt">; blockedReason?: string },
  ): Promise<void>;
  /** Mirrors `cards.acknowledgeHumanEdit` (officium-api.md §5), as an agent. */
  simulateAgentAcknowledge(projectId: string, cardKey: string): Promise<Card>;
  /** Mirrors `cards.update` (officium-api.md §5), as an agent: its writes are never a human edit. */
  simulateAgentUpdate(projectId: string, cardKey: string, patch: { description?: string; actionPlan?: string }): Promise<void>;
  /** Mirrors `cards.setWorkflow` (JAVA-1591), as an agent: the workflow is stored only when it fits the card. */
  simulateAgentSetWorkflow(projectId: string, cardKey: string, workflow: CardWorkflow | null): Promise<void>;
  /** Mirrors `cards.comment` (officium-api.md §5), as an agent: its comments are never a human edit.
   *  `parentId` makes it a reply (JAVA-524). Resolves to the new comment's id. */
  simulateAgentComment(projectId: string, cardKey: string, text: string, parentId?: string): Promise<string>;
  /** Mirrors `cards.create` with `cards: [...]`, as an agent: every card lands, and its live event
   *  goes out, in the same tick -- the burst a batch import sends the board. */
  simulateAgentCreateCards(projectId: string, titles: string[]): Promise<void>;
  /** Mirrors `projects.update` (officium-api.md §5) from another session: the change reaches
   *  this page only through the live channel, as an agent's would (JAVA-125). */
  simulateProjectUpdate(projectId: string, patch: { name?: string; icon?: string; iconColor?: ProjectColor }): Promise<void>;
  /** Mirrors `projects.create` (officium-api.md §5): a project made elsewhere, so a page learns of
   *  it only by refetching. Resolves to the new project's id. */
  simulateCreateProject(name: string, keyPrefix: string): Promise<string>;
  /** Mirrors `docs.upsert` (officium-api.md §8.7), as an agent: creates the page, or changes it
   *  against the version it reads first -- the write reaches a page only through the live channel. */
  simulateAgentDocUpsert(projectId: string, path: string, input: Pick<DocUpsertInput, "title" | "body" | "draft" | "template">): Promise<void>;
  /** The same write by another project member (Ana), so her unpublished draft can be seen NOT to be yours (JAVA-793). */
  simulateMemberDocUpsert(projectId: string, path: string, input: { title?: string; body?: string; draft?: boolean }): Promise<void>;
  /** The owner's room for page bytes, or null for none (JAVA-801): a write past it answers `storage_quota_exceeded`. */
  simulateDocAllowance(bytes: number | null): void;
  /** Mirrors `docs.move` (officium-api.md §8.20), as an agent: the move reaches a page only through the live channel. */
  simulateAgentDocMove(projectId: string, path: string, to: string): Promise<void>;
  /** Mirrors `docs.get`: the page as stored, so a spec checks what an autosave wrote (JAVA-796). */
  readDoc(projectId: string, path: string): Promise<DocPage>;
  /** Mirrors `docs.comments.add` (officium-api.md §8.25), as an agent: the comment reaches a page only through the live channel. */
  simulateAgentDocComment(projectId: string, path: string, input: DocCommentInput): Promise<DocThread>;
  /** Mirrors `docs.comments.list` with `state: all`: the threads as stored, so a spec checks what the panel wrote. */
  readDocComments(projectId: string, path: string): Promise<DocThread[]>;
  /** The owner's storage running out (or freed again): comments that add text are refused while it is full. */
  setDocStorageFull(projectId: string, full: boolean): void;
  /** Another person arriving on a page, or changing state there (JAVA-802, §8.19): what their open page's beat does. */
  seedDocPresence(projectId: string, path: string, person: { accountId: string; name: string; state: "viewing" | "editing" }): void;
  /** That person leaving the page. */
  clearDocPresence(projectId: string, path: string, accountId: string): void;
  /** What the board says about a page: what other people's open pages would be told. */
  readDocPresence(projectId: string, path: string): DocPresence;
  /** Mirrors `docs.node.update` (officium-api.md §8.17), as an agent: the layout reaches a page only through the live channel. */
  simulateAgentDocNodeUpdate(projectId: string, path: string, input: { fullWidth?: boolean }): Promise<void>;
  /** Mirrors `POST /officium/v1/changelog/ingest` (officium-api.md §8.8): a pipeline recording a
   *  merge with the project's token. Throws `invalid_token` for any token but the current one;
   *  returns the entry's id (the existing one for a ref already recorded). */
  simulatePipelineRecord(token: string, change: { ref: string; title: string; url?: string; areas?: string[] }): string;
  /** Mirrors `POST /officium/v1/tests/ingest`: the project's test runner posting a full run with the
   *  pipeline token (officium-api.md §8.12). Answers the run's id. */
  simulateTestRun(
    token: string,
    run: { ref: string; branch?: string; machine?: string; startedAt: string; suites: { name: string; ok: boolean; seconds: number }[] },
  ): string;
  /** Mirrors `cards.link` type `blocks`, as an agent: `blockerKey` blocks `blockedKey` (JAVA-1114). */
  simulateAgentBlocks(projectId: string, blockerKey: string, blockedKey: string): Promise<void>;
  /** Marks a card as ranked by a precedence rule (or clears it): the twin does not run the matcher on cards. */
  simulateCardPrecedence(projectId: string, keyOrId: string, precedence: CardPrecedence | null): void;
  /** Plants the history lines a precedence rule wrote on a card (the twin runs no matcher). */
  simulateCardPrecedenceActivity(projectId: string, cardKey: string, lines: { id: string; operation: string; summary: string; at: string }[]): void;
  /** Mirrors `cards.move`, as an agent, to the end of the column (JAVA-1114). */
  simulateAgentMove(projectId: string, cardKey: string, status: Status): Promise<void>;
  /** Mirrors `cards.requestAction` (JAVA-1122), as an agent: asks the person for one quick action. */
  simulateAgentRequestAction(projectId: string, cardKey: string, input: { action: string; detail?: string; why?: string }): CardRequest;
  /** Mirrors `cards.closeRequest`, as an agent: it is done with the request, answered or not. */
  simulateAgentCloseRequest(projectId: string, cardKey: string): void;
  /** The person answers a request from ANOTHER session: this page learns of it only through the live channel. */
  simulateRequestAnswered(projectId: string, requestId: string, answer: "done" | "declined"): Promise<void>;
  /** The project's live requests, as the person's own read sees them (open, or answered and not closed). */
  readRequests(projectId: string): Promise<CardRequest[]>;
  /** How many times the board called each repository method -- what a burst of live events costs. */
  repositoryCalls(): Record<string, number>;
  /** The next `times` calls of a counted read (`getRoleMatrix`, `listCards`, ...) or of a page save
   *  (`upsertDoc`, JAVA-796) throw, as a
   *  failed request would; `0` stops it. The only way to reach an error state and its retry. */
  simulateReadFailure(method: string, times: number): void;
  /** Holds `method`'s calls pending until called again with `false`: the loading state, or a page save
   *  in flight (`upsertDoc`), seen. */
  simulateReadHold(method: string, held: boolean): void;
  /** The signed-in person as an editor or viewer of a project, not its owner (JAVA-243). */
  simulateCallerRole(projectId: string, role: Role): void;
  /** The owner's collaborators against the cap (JAVA-1009): at the cap a new person is refused, and
   *  the dialog says so. `null` clears it. */
  simulateCollaboratorQuota(quota: CollaboratorQuota | null): void;
  /** The repositories (`owner/repo`) the demo's GitHub says feed the project: the pipeline dialog shows them. */
  simulateGithubConnected(projectId: string, repos: string[]): void;
  /** The repositories (`owner/repo`) the caller may connect to the project: Connect moves one to the connected list. */
  simulateGithubAvailable(projectId: string, repos: string[]): void;
  /** Mirrors `projects.setRoleMatrix` (officium-api.md §8.9) from another session, against the
   *  version it reads first: the change reaches this page only through the live channel. */
  simulateRoleMatrixSave(projectId: string, overrides: RoleMatrix): Promise<void>;
  /** Mirrors `projects.roleMatrix`: what the project has saved, as the MCP would answer it. */
  readRoleMatrix(projectId: string): Promise<RoleMatrixView>;
  /** Mirrors `cards.create` for one card, as an agent, with its category and status. */
  simulateAgentCreateCard(
    projectId: string,
    input: { title: string; category: Category; status: Status; epic?: string | null; sprintId?: string | null; description?: string },
  ): Promise<Card>;
  /** Mirrors `cards.get`: the card as an agent reads it, `eligibleRoles` included. */
  readCard(projectId: string, keyOrId: string): Promise<Card>;
  /** Mirrors `PUT /cards/{key}/form` (officium-api.md §8.16, JAVA-894): a human card gets a Quaestio
   *  form of that many questions, written by an agent over the MCP. */
  simulateAttachForm(projectId: string, cardKey: string, questions: number): void;
  /** What the SERVER does when you finish a card's form: as its assignee your answer moves the card
   *  to Ready; as anyone else it changes nothing. */
  simulateFormCompleted(projectId: string, cardKey: string, answers: FormAnswer[]): Promise<void>;
}

declare global {
  interface Window {
    __OFFICIUM_MOCK__?: OfficiumMockHooks;
  }
}

export function installMockTestHooks(): void {
  if (typeof window === "undefined" || window.__OFFICIUM_MOCK__) return;
  const repository = getSharedBacklogRepository();

  window.__OFFICIUM_MOCK__ = {
    async simulateAgentRequestHuman(projectId, input) {
      // The body `CardService.renderRequestHumanBody` writes on the API.
      const description =
        `## Why this needs you\n${input.why}\n\n`
        + `## Steps\n${input.steps}\n\n`
        + `## Done when\n${input.doneWhen}\n\n`
        + `## Unblocks\n${input.unblocks.length ? input.unblocks.map((key) => `- ${key}`).join("\n") : "(none)"}`;
      let card = await repository.createCard(
        projectId,
        { title: input.title, description, executor: "human", status: "todo" },
        AGENT,
      );
      for (const key of input.unblocks) {
        const fresh = await repository.getCard(projectId, card.id);
        const result = await repository.linkCard(
          projectId,
          fresh.id,
          { expectedVersion: fresh.version, type: "blocks", target: key },
          AGENT,
        );
        if (!isConflict(result)) card = result;
      }
      return card;
    },
    async simulateAgentBlocks(projectId, blockerKey, blockedKey) {
      const blocker = await repository.getCard(projectId, blockerKey);
      await repository.linkCard(projectId, blocker.id, { expectedVersion: blocker.version, type: "blocks", target: blockedKey }, AGENT);
    },
    async simulateAgentMove(projectId, cardKey, status) {
      const card = await repository.getCard(projectId, cardKey);
      await repository.moveCard(projectId, card.id, { expectedVersion: card.version, status, position: 1_000_000 }, AGENT);
    },
    simulateAgentWorking(projectId, cardKey, activelyWorking) {
      return repository.setActivelyWorking(projectId, cardKey, activelyWorking, AGENT);
    },
    simulateAgentStatus(projectId, cardKey, text) {
      return repository.reportStatus(projectId, cardKey, text, AGENT);
    },
    simulateMachine(projectId, online) {
      repository.setMachineOnline(projectId, online);
    },
    async simulateAgentWindow(sessionId, label, state, queued = [], report = {}) {
      repository.setAgentWindow(sessionId, label, state, report);
      for (const card of queued) await repository.queueCard(card.projectId, card.cardKey, sessionId);
    },
    simulateAgentAcknowledge(projectId, cardKey) {
      return repository.acknowledgeHumanEdit(projectId, cardKey, AGENT);
    },
    async simulateAgentComment(projectId, cardKey, text, parentId) {
      const card = await repository.getCard(projectId, cardKey);
      const detail = await repository.addComment(projectId, card.id, text, parentId, AGENT);
      return detail.comments[detail.comments.length - 1].id;
    },
    async simulateAgentCreateCards(projectId, titles) {
      // Not awaited one by one on purpose: `createCard` emits before it yields, so all the events
      // reach the board before any of its reloads can finish.
      await Promise.all(titles.map((title) => repository.createCard(projectId, { title, status: "todo" }, AGENT)));
    },
    async simulateProjectUpdate(projectId, patch) {
      const project = await repository.getProject(projectId);
      await repository.updateProject(projectId, { expectedVersion: project.version, ...patch });
    },
    async simulateCreateProject(name, keyPrefix) {
      return (await repository.createProject({ name, keyPrefix })).id;
    },
    ...docMockHooks(repository, AGENT),
    ...presenceMockHooks(repository),
    ...profileMockHooks(repository, AGENT),
    ...autoloopMockHooks(),
    ...cardAgentMockHooks(repository, AGENT),
    simulatePipelineRecord(token, change) {
      return repository.ingestChangelog(token, change).id;
    },
    simulateTestRun(token, run) {
      return repository.ingestTestRun(token, run).id;
    },
    ...requestMockHooks(repository, AGENT),
    repositoryCalls() {
      return { ...repository.calls };
    },
    simulateReadFailure(method, times) {
      repository.failReads(method, times);
    },
    simulateReadHold(method, held) {
      repository.holdReads(method, held);
    },
    simulateCallerRole(projectId, role) {
      repository.setCallerRole(projectId, role);
    },
    simulateCollaboratorQuota(quota) {
      repository.setCollaboratorQuota(quota);
    },
    simulateGithubConnected(projectId, repos) {
      repository.setGithubConnected(projectId, repos);
    },
    simulateGithubAvailable(projectId, repos) {
      repository.setGithubAvailable(projectId, repos);
    },
    async simulateRoleMatrixSave(projectId, overrides) {
      const current = await repository.getRoleMatrix(projectId);
      await repository.setRoleMatrix(projectId, { expectedVersion: current.version, overrides });
    },
    readRoleMatrix(projectId) {
      return repository.getRoleMatrix(projectId);
    },
    simulateAgentCreateCard(projectId, input) {
      return repository.createCard(projectId, input, AGENT);
    },
    readCard(projectId, keyOrId) {
      return repository.getCard(projectId, keyOrId);
    },
    simulateAttachForm(projectId, cardKey, questions) {
      repository.attachForm(projectId, cardKey, questions);
    },
    simulateFormCompleted(projectId, cardKey, answers) {
      return repository.completeForm(projectId, cardKey, answers);
    },
  };
}
