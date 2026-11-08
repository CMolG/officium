import type { BoardCard, BoardCopy } from "../board-copy";
import { takeLegacyBoardCopy } from "../board-copy";
import type { AgentWork, Card, Project, ProjectMeta, Sprint } from "../types";
import { idbClear, idbDeleteWhere, idbGet, idbUpdate } from "./idb";

/** The header's part of the board: the project and the agents' work. */
export interface BoardHeaderCopy {
  project: Project;
  working: AgentWork[];
}

/** What hangs off the cards: the filters' epics, tags and assignees, the "Needs you" lane and the active sprint. */
export interface BoardAroundCopy {
  projectMeta: ProjectMeta;
  needsYou: Card[];
  activeSprint: Sprint | null;
}

/** The last visit's board, as the browser kept it. Each part is written by the hook that reads it. */
export interface BoardStore {
  copy: BoardCopy | null;
  header: BoardHeaderCopy | null;
  around: BoardAroundCopy | null;
  /** The project's epics, finished ones too, as faces (JAVA-1633); null until a read has kept them. */
  epics: BoardCard[] | null;
}

/** One account's board of one project: an account never sees another's copy, even on a shared device. */
const keyOf = (accountId: string, projectId: string) => `${accountId}:${projectId}`;

/**
 * A signed-in read keeps only this account's records: a copy another account left on a shared device
 * goes here, since its sign-out may have happened where this board cannot see it. Transactions on
 * the same stores run in the order they were opened, so the read below sees the sweep done.
 */
function dropOtherAccounts(accountId: string): Promise<void> {
  const others = (key: string) => !key.includes(`${accountId}:`);
  return Promise.all([idbDeleteWhere("cards", others), idbDeleteWhere("meta", others)]).then(() => undefined);
}

export async function readBoardStore(accountId: string, projectId: string): Promise<BoardStore> {
  void dropOtherAccounts(accountId).catch(() => {});
  const key = keyOf(accountId, projectId);
  let copy = (await idbGet<BoardCopy>("cards", key)) ?? null;
  if (!copy) {
    // The copy `localStorage` kept before JAVA-1575: moved here once, then gone from `localStorage`.
    const legacy = takeLegacyBoardCopy(projectId);
    if (legacy) {
      await idbUpdate<BoardCopy>("cards", key, () => legacy);
      copy = legacy;
    }
  }
  const [header, around, epics] = await Promise.all([
    idbGet<BoardHeaderCopy>("meta", `header:${key}`),
    idbGet<BoardAroundCopy>("meta", `around:${key}`),
    idbGet<BoardCard[]>("meta", `epics:${key}`),
  ]);
  return { copy, header: header ?? null, around: around ?? null, epics: epics ?? null };
}

/**
 * The projects this page was refused (a 403 or a 404). The board's other requests are still in
 * flight when the refusal lands, and their answers must not write the copy back after it is
 * forgotten. Lasts for the page: a reload asks again.
 */
const refused = new Set<string>();

/** An older copy never overwrites a newer one: a second tab that answered first keeps its place. */
export function writeBoardCards(accountId: string, projectId: string, copy: BoardCopy): Promise<void> {
  if (refused.has(projectId)) return Promise.resolve();
  return idbUpdate<BoardCopy>("cards", keyOf(accountId, projectId), (current) =>
    current && current.asOf > copy.asOf ? undefined : copy,
  );
}

export function writeBoardHeader(accountId: string, projectId: string, header: BoardHeaderCopy): Promise<void> {
  if (refused.has(projectId)) return Promise.resolve();
  return idbUpdate<BoardHeaderCopy>("meta", `header:${keyOf(accountId, projectId)}`, () => header);
}

export function writeBoardAround(accountId: string, projectId: string, around: BoardAroundCopy): Promise<void> {
  if (refused.has(projectId)) return Promise.resolve();
  return idbUpdate<BoardAroundCopy>("meta", `around:${keyOf(accountId, projectId)}`, () => around);
}

/** The epics as faces: the Backlog's badges name them, and a warm visit reads none (JAVA-1633). */
export function writeBoardEpics(accountId: string, projectId: string, epics: BoardCard[]): Promise<void> {
  if (refused.has(projectId)) return Promise.resolve();
  return idbUpdate<BoardCard[]>("meta", `epics:${keyOf(accountId, projectId)}`, () => epics);
}

/**
 * Signing out takes the whole copy with it. A project this account can no longer read (a 403 or a
 * 404) takes only that project's records: every key ends in `:<projectId>`, the meta ones too.
 */
export async function forgetBoardStore(projectId?: string): Promise<void> {
  if (!projectId) {
    await Promise.all([idbClear("cards"), idbClear("meta")]);
    return;
  }
  refused.add(projectId);
  const ofProject = (key: string) => key.endsWith(`:${projectId}`);
  await Promise.all([idbDeleteWhere("cards", ofProject), idbDeleteWhere("meta", ofProject)]);
}
