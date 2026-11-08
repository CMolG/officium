import type { Actor, DocHistory, DocPage, DocRevision, DocSettings, DocUpsertInput, WriteResult } from "../types";
import { isConflict } from "../types";
import { applyHistoryPolicy, expiresAt, type PolicyRevision } from "../../docs/history-policy";
import { ApiError } from "../api-error";
import { newId } from "../format";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { MemoryDocNodes } from "./doc-nodes";

const DEFAULT_HISTORY_DAYS = 15;
const MAX_HISTORY_DAYS = 3650;
const bytesOf = (...values: string[]) => values.reduce((sum, value) => sum + new TextEncoder().encode(value).length, 0);

interface StoredRevision extends PolicyRevision {
  pageId: string;
  title: string;
  body: string;
  author: Actor;
  writtenAt: string;
}

interface StoredSettings {
  historyDays: number;
  version: number;
  updatedBy: Actor | null;
  updatedAt: string | null;
}

/** The edit session a page's last checkpoint opened (JAVA-796): its autosaves keep no version. */
interface OpenSession {
  id: string;
  author: string;
  at: number;
}
const SESSION_WINDOW_MS = 5 * 60_000;

/** The API's page history over the in-memory pages: every write that replaces a page keeps the version it replaced by the same policy. */
export class MemoryDocHistory extends MemoryDocNodes {
  protected readonly revisionsByPage = new Map<string, StoredRevision[]>();
  private readonly sessionsByPage = new Map<string, OpenSession>();
  private readonly settingsByProject = new Map<string, StoredSettings>();

  private settingsOf(projectId: string): StoredSettings {
    return this.settingsByProject.get(projectId) ?? { historyDays: DEFAULT_HISTORY_DAYS, version: 0, updatedBy: null, updatedAt: null };
  }

  override async upsertDoc(
    projectId: string,
    rawPath: string,
    input: DocUpsertInput,
    actor: Actor = YOU,
  ): Promise<WriteResult<DocPage>> {
    // Counted and holdable like a read (`mock-test-hooks.ts`): a spec sees a save in flight, fails one, and counts them.
    this.count("upsertDoc");
    await this.holds.get("upsertDoc")?.promise;
    const before = this.requireRecord(projectId).docs.get(this.currentDocPath(projectId, this.requireDocPath(rawPath)));
    const result = await super.upsertDoc(projectId, rawPath, input, actor);
    if (isConflict(result) || (before && result.version === before.version)) return result;
    const author = `${actor.kind}:${actor.accountId}`;
    const open = this.sessionsByPage.get(result.id);
    const at = Date.now();
    if (before && open && open.id === input.editSession && open.author === author && at - open.at <= SESSION_WINDOW_MS) {
      return { ...result, historyKept: true, revisionId: null };
    }
    if (input.editSession) this.sessionsByPage.set(result.id, { id: input.editSession, author, at });
    else this.sessionsByPage.delete(result.id);
    if (!before) return result;
    const retiring: StoredRevision = {
      id: newId("rev"), pageId: before.id, version: before.version, title: before.title, body: before.body,
      weightBytes: bytesOf(before.title, before.body), author: before.updatedBy, writtenAt: before.updatedAt,
      retiredAt: now(), heaviest: false,
    };
    const kept = this.revisionsByPage.get(before.id) ?? [];
    const outcome = applyHistoryPolicy(kept, retiring, bytesOf(result.title, result.body), this.settingsOf(projectId).historyDays, new Date());
    this.revisionsByPage.set(before.id, outcome.kept);
    return { ...result, historyKept: true, revisionId: outcome.kept.some((r) => r.id === retiring.id) ? retiring.id : null };
  }

  private view(revision: StoredRevision, historyDays: number): DocRevision {
    return {
      id: revision.id, version: revision.version, title: revision.title, body: revision.body, sizeBytes: revision.weightBytes,
      author: revision.author, writtenAt: revision.writtenAt, retiredAt: revision.retiredAt,
      expiresAt: expiresAt(revision, historyDays), heaviest: revision.heaviest,
    };
  }

  async getDocHistory(projectId: string, path: string): Promise<DocHistory> {
    const current = await this.getDoc(projectId, path);
    const historyDays = this.settingsOf(projectId).historyDays;
    const kept = this.revisionsByPage.get(current.id) ?? [];
    return { current, historyDays, revisions: kept.map((revision) => this.view(revision, historyDays)) };
  }

  async restoreDocRevision(projectId: string, path: string, revisionId: string, expectedVersion: number): Promise<WriteResult<DocPage>> {
    const current = await this.getDoc(projectId, path);
    const revision = (this.revisionsByPage.get(current.id) ?? []).find((r) => r.id === revisionId);
    if (!revision) throw new ApiError("doc_revision_not_found", "No such version of the page", 404);
    return this.upsertDoc(projectId, path, { title: revision.title, body: revision.body, expectedVersion });
  }

  async deleteDocRevision(projectId: string, path: string, revisionId: string, confirm: string): Promise<void> {
    const current = await this.getDoc(projectId, path);
    if (confirm.trim() !== current.title) {
      throw new ApiError("confirmation_mismatch", `Deleting a version is final: type the page's title ("${current.title}") to confirm`, 400);
    }
    const kept = this.revisionsByPage.get(current.id) ?? [];
    if (!kept.some((r) => r.id === revisionId)) throw new ApiError("doc_revision_not_found", "No such version of the page", 404);
    // The policy runs again over what is left, so deleting the heaviest flags the next heaviest at once.
    const left = kept.filter((r) => r.id !== revisionId);
    const outcome = applyHistoryPolicy(left, null, bytesOf(current.title, current.body), this.settingsOf(projectId).historyDays, new Date());
    this.revisionsByPage.set(current.id, outcome.kept);
    this.emit(projectId, { type: "doc.changed", path: current.path, actor: YOU });
  }

  /** What the project's comments weigh (JAVA-797): the comments store is further down the chain and says. */
  protected commentBytes(_projectId: string): number {
    return 0;
  }

  async getDocSettings(projectId: string): Promise<DocSettings> {
    const record = this.requireRecord(projectId);
    const settings = this.settingsOf(projectId);
    const pages = [...record.docs.values()];
    // A trashed page keeps its versions until it is purged (JAVA-793), so they still weigh.
    const trashed = [...record.docTrash.values()].map((entry) => entry.page);
    const weight = (list: DocPage[]) => list.reduce((sum, page) => sum + bytesOf(page.path, page.title, page.body), 0);
    const historyBytes = [...pages, ...trashed].flatMap((page) => this.revisionsByPage.get(page.id) ?? []).reduce((sum, r) => sum + bytesOf(r.title, r.body), 0);
    return {
      ...settings,
      storage: { pagesBytes: weight(pages), historyBytes, attachmentsBytes: 0, trashBytes: weight(trashed), commentsBytes: this.commentBytes(projectId) },
    };
  }

  async updateDocSettings(projectId: string, input: { historyDays: number; expectedVersion?: number }): Promise<DocSettings> {
    const record = this.requireRecord(projectId);
    if (record.project.role !== "owner") throw new ApiError("owner_only", "Only the project's owner changes how long history is kept", 403);
    const current = this.settingsOf(projectId);
    if (input.expectedVersion !== undefined && input.expectedVersion !== current.version) {
      throw new ApiError("version_conflict", "The settings changed since you read them", 409);
    }
    if (!Number.isInteger(input.historyDays) || input.historyDays < 0 || input.historyDays > MAX_HISTORY_DAYS) {
      throw new ApiError("invalid_history_days", `History is kept for 0 to ${MAX_HISTORY_DAYS} days`, 400);
    }
    this.settingsByProject.set(projectId, { historyDays: input.historyDays, version: current.version + 1, updatedBy: YOU, updatedAt: now() });
    // A shorter window applies to what is kept at once.
    for (const page of record.docs.values()) {
      const kept = this.revisionsByPage.get(page.id);
      if (kept) this.revisionsByPage.set(page.id, applyHistoryPolicy(kept, null, bytesOf(page.title, page.body), input.historyDays, new Date()).kept);
    }
    this.emit(projectId, { type: "doc.changed", actor: YOU });
    return this.getDocSettings(projectId);
  }
}
