import type {
  Actor,
  ChangelogEntry,
  ChangelogListing,
  ChangelogTokenStatus,
  DocsStatus,
  IssuedChangelogToken,
  DocPage,
  DocPageSummary,
  DocPresence,
  DocPresenceState,
  DocUpsertInput,
  VersionConflict,
  WriteResult,
} from "../types";
import {
  BUILTIN_PREFIX,
  RESERVED_DOC_PATHS,
  DOC_PATH_HINT,
  isBuiltinDocPath,
  normalizeDocPath,
} from "../../docs/doc-path";
import { newId } from "../format";
import { MemoryDocPresence } from "../../docs/presence/memory-presence";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { BUILTIN_DOCS } from "./sample-record";
import { MemoryTestRuns } from "./test-runs";
import type { ProjectRecord } from "./sample-record";

export class MemoryDocs extends MemoryTestRuns {
  /** Who is on which page (JAVA-802); the mock hooks seed the other people. */
  readonly docPresence = new MemoryDocPresence((projectId, path, actor) =>
    this.emit(projectId, { type: "doc.presence", path, actor }),
  );

  async beatDocPresence(projectId: string, path: string, client: string, state: DocPresenceState): Promise<DocPresence> {
    const normalized = await this.requirePresencePage(projectId, path, state);
    return this.docPresence.beat(projectId, normalized, client, state, YOU);
  }

  async leaveDocPresence(projectId: string, path: string, client: string): Promise<void> {
    this.docPresence.leave(projectId, this.requireDocPath(path), client, YOU);
  }

  /** The API's checks: the page exists, and editing needs an editor and a page that isn't built in. */
  private async requirePresencePage(projectId: string, path: string, state: DocPresenceState): Promise<string> {
    const { path: normalized, builtin } = await this.getDoc(projectId, path);
    if (state === "editing" && (builtin || this.requireRecord(projectId).project.role === "viewer")) {
      throw new ApiError("read_only", "Only editors edit a page", 403);
    }
    return normalized;
  }

  protected requireDocPath(raw: string): string {
    const path = normalizeDocPath(raw);
    if (!path) throw new ApiError("invalid_doc_path", `"${raw}" is not a page path. ${DOC_PATH_HINT}`, 400);
    return path;
  }

  /** The tree: published pages and your own unpublished drafts, never an archived one (JAVA-793). */
  async listDocs(projectId: string, q?: string): Promise<DocPageSummary[]> {
    const needle = q?.trim().toLowerCase();
    return [...this.requireRecord(projectId).docs.values()]
      .filter((d) => !d.archivedAt && !d.template && isVisibleDoc(d, YOU.accountId))
      .concat(BUILTIN_DOCS.map((page) => ({ ...page, projectId })))
      .filter((d) => !needle || [d.path, d.title, d.body].some((text) => text.toLowerCase().includes(needle)))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((page) => summaryOf(page));
  }

  async getDoc(projectId: string, path: string): Promise<DocPage> {
    this.count("getDoc");
    return this.readDoc(projectId, path);
  }

  /** What `getDoc` answers, uncounted: the backlinks and the duplicate read a page too, and are not the page's own read. */
  protected readDoc(projectId: string, path: string): DocPage {
    const normalized = this.requireDocPath(path);
    const builtin = BUILTIN_DOCS.find((page) => page.path === normalized);
    const record = this.requireRecord(projectId);
    const page = builtin ? { ...builtin, projectId } : record.docs.get(normalized);
    if (page && isVisibleDoc(page, YOU.accountId)) return { ...page };
    const followed = page ? null : this.followRedirect(record, normalized);
    if (!followed || !isVisibleDoc(followed.page, YOU.accountId)) throw new ApiError("doc_not_found", "No such page", 404);
    return { ...followed.page, redirectedFrom: followed.redirectedFrom };
  }

  /** The page an old path leads to: the longest redirect that is the path or a segment prefix of it. */
  protected followRedirect(record: ProjectRecord, path: string): { page: DocPage; redirectedFrom: string } | null {
    const segments = path.split("/");
    for (let length = segments.length; length > 0; length -= 1) {
      const id = record.docRedirects.get(segments.slice(0, length).join("/"));
      const target = id === undefined ? undefined : [...record.docs.values()].find((page) => page.id === id);
      if (!target) continue;
      const remainder = segments.slice(length).join("/");
      const page = remainder ? record.docs.get(`${target.path}/${remainder}`) : target;
      return page ? { page, redirectedFrom: path } : null;
    }
    return null;
  }

  /** Where the page asked for lives now: its own path, or the one a redirect leads to. */
  protected currentDocPath(projectId: string, path: string): string {
    const record = this.requireRecord(projectId);
    return record.docs.has(path) ? path : (this.followRedirect(record, path)?.page.path ?? path);
  }

  /** As the API: the prefix is refused to every role, after the project is known to be the caller's. */
  protected requireWritableDocPath(projectId: string, raw: string): string {
    this.requireRecord(projectId);
    const path = this.requireDocPath(raw);
    if (isBuiltinDocPath(path)) {
      throw new ApiError(
        "builtin_doc_read_only",
        `Pages under "${BUILTIN_PREFIX}/" are Officium's own documentation, the same in every project: nobody can change or delete them from a project. Give your page another path.`,
        403,
      );
    }
    return path;
  }

  async upsertDoc(
    projectId: string,
    rawPath: string,
    input: DocUpsertInput,
    actor: Actor = YOU,
  ): Promise<WriteResult<DocPage>> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    const record = this.requireRecord(projectId);
    const reserved = RESERVED_DOC_PATHS[path];
    if (reserved) throw new ApiError("reserved_doc_path", `"${path}" is where ${reserved} lives: give the page another path`, 400);
    const title = input.title?.trim();
    if (input.title !== undefined && !title) throw new ApiError("title_required", "A page needs a title", 400);
    let existing = record.docs.get(path);
    let redirectedFrom: string | null = null;
    if (!existing && (input.expectedVersion ?? 0) >= 1) {
      const followed = this.followRedirect(record, path);
      if (followed) {
        existing = followed.page;
        redirectedFrom = path;
      }
    }
    const at = now();
    // Somebody else's unpublished draft holds the path: say so without handing the page over.
    if (existing && !isVisibleDoc(existing, actor.accountId)) {
      throw new ApiError("doc_path_taken", "That path is taken by a page you cannot see yet: give yours another path", 409);
    }

    if (!existing) {
      if (input.expectedVersion) throw new ApiError("doc_not_found", "No such page", 404);
      if (!title) throw new ApiError("title_required", "A page needs a title", 400);
      const page: DocPage = {
        id: newId("doc"), projectId, path, title, body: input.body ?? "", version: 1,
        createdBy: actor, updatedBy: actor, createdAt: at, updatedAt: at, builtin: false,
        publishedAt: input.draft ? null : at, archivedAt: null, archivedBy: null, template: input.template === true,
      };
      record.docs.set(path, page);
      record.docRedirects.delete(path);
      if (page.publishedAt) this.emit(projectId, { type: "doc.changed", path, version: page.version, actor });
      return { ...page };
    }
    if (input.draft) {
      throw new ApiError("draft_only_on_create", "`draft` only means something when the page is created; publish it instead", 400);
    }
    if (existing.archivedAt) throw new ApiError("doc_archived", `"${path}" is archived: unarchive it before changing it`, 409);
    if (input.expectedVersion !== existing.version) {
      return { error: "version_conflict", message: "Someone else saved this page first", current: { ...existing, redirectedFrom } };
    }
    const next = { ...existing, title: title ?? existing.title, body: input.body ?? existing.body };
    if (next.title === existing.title && next.body === existing.body) return { ...existing, redirectedFrom };
    Object.assign(next, { version: existing.version + 1, updatedBy: actor, updatedAt: at });
    record.docs.set(existing.path, next);
    if (next.publishedAt) this.emit(projectId, { type: "doc.changed", path: existing.path, version: next.version, actor });
    return { ...next, redirectedFrom };
  }

  /** Into the trash, not away (JAVA-793): the path is free at once, and the page comes back by its id. */
  async deleteDoc(projectId: string, rawPath: string, expectedVersion: number): Promise<void | VersionConflict<DocPage>> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    const record = this.requireRecord(projectId);
    const existing = record.docs.get(path);
    if (!existing || !isVisibleDoc(existing, YOU.accountId)) throw new ApiError("doc_not_found", "No such page", 404);
    if (existing.version !== expectedVersion) {
      return { error: "version_conflict", message: "Someone else saved this page first", current: { ...existing } };
    }
    record.docs.delete(path);
    record.docTrash.set(existing.id, { page: existing, deletedAt: now(), deletedBy: YOU });
    this.emit(projectId, { type: "doc.changed", path, actor: YOU });
  }

  // ---- documentation changelog (officium-api.md §8.8) ----------------------------------------

  async listChangelog(projectId: string, query: { status?: DocsStatus; limit?: number } = {}): Promise<ChangelogListing> {
    const record = this.requireRecord(projectId);
    const items = [...record.changelog]
      .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt) || b.recordedAt.localeCompare(a.recordedAt))
      .filter((entry) => !query.status || entry.status === query.status)
      .slice(0, query.limit ?? 100)
      .map((entry) => ({ ...entry }));
    return { items, pendingCount: record.changelog.filter((entry) => entry.status === "pending").length };
  }

  /** What `POST /officium/v1/changelog/ingest` and `docs.changelog.record` do: idempotent on `ref`.
   *  Not part of `BacklogRepository` -- the web never records; the mock hooks stand in for the pipeline. */
  recordChangelogEntry(
    projectId: string,
    change: { ref: string; title: string; url?: string; areas?: string[]; mergedAt?: string },
    actor: Actor,
  ): ChangelogEntry {
    const record = this.requireRecord(projectId);
    const existing = record.changelog.find((entry) => entry.ref === change.ref);
    if (existing) return { ...existing };
    const at = now();
    const entry: ChangelogEntry = {
      id: newId("chl"), projectId, ref: change.ref, title: change.title.split("\n")[0].trim(), url: change.url ?? null,
      areas: change.areas ?? [], mergedAt: change.mergedAt ?? at, status: "pending", pages: [], recordedBy: actor,
      recordedAt: at, markedBy: null, markedAt: null, version: 1,
    };
    record.changelog.push(entry);
    this.emit(projectId, { type: "changelog.changed", actor });
    return { ...entry };
  }

  async markChangelogEntry(
    projectId: string,
    entryId: string,
    input: { status: DocsStatus; pages: string[]; expectedVersion: number },
  ): Promise<WriteResult<ChangelogEntry>> {
    const record = this.requireRecord(projectId);
    const index = record.changelog.findIndex((entry) => entry.id === entryId);
    if (index < 0) throw new ApiError("changelog_entry_not_found", "No such change", 404);
    const current = record.changelog[index];
    if (current.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "Someone else marked this change first", current: { ...current } };
    }
    const pages = [...new Set(input.pages.map((page) => this.requireDocPath(page)))];
    if (input.status === "updated" && pages.length === 0) {
      throw new ApiError("pages_required", "Say which pages were updated for this change", 400);
    }
    if (input.status !== "updated" && pages.length > 0) {
      throw new ApiError("pages_not_allowed", "Only an updated change names pages", 400);
    }
    const missing = pages.find((page) => !record.docs.has(page) && !BUILTIN_DOCS.some((builtin) => builtin.path === page));
    if (missing) throw new ApiError("unknown_doc_page", `The project has no page "${missing}"`, 400);
    if (current.status === input.status && current.pages.join("\n") === pages.join("\n")) return { ...current };
    const pending = input.status === "pending";
    const next: ChangelogEntry = {
      ...current, status: input.status, pages, markedBy: pending ? null : YOU, markedAt: pending ? null : now(),
      version: current.version + 1,
    };
    record.changelog[index] = next;
    this.emit(projectId, { type: "changelog.changed", actor: YOU });
    return { ...next };
  }

  async getChangelogToken(projectId: string): Promise<ChangelogTokenStatus> {
    this.count("getChangelogToken");
    await this.holds.get("getChangelogToken")?.promise;
    const token = this.requireRecord(projectId).changelogToken;
    return token ? { configured: true, createdBy: token.createdBy, createdAt: token.createdAt }
      : { configured: false, createdBy: null, createdAt: null };
  }

  async issueChangelogToken(projectId: string): Promise<IssuedChangelogToken> {
    const record = this.requireRecord(projectId);
    if (record.project.role !== "owner") throw new ApiError("owner_only", "Only the project's owner connects its pipeline", 403);
    const createdAt = now();
    const token = `ofcl_${newId("tok").replace(/[^a-z0-9]/gi, "")}${Date.now().toString(16)}`;
    record.changelogToken = { token, createdBy: YOU, createdAt };
    this.emit(projectId, { type: "changelog.changed", actor: YOU });
    return { token, createdAt };
  }

  async revokeChangelogToken(projectId: string): Promise<void> {
    const record = this.requireRecord(projectId);
    if (record.project.role !== "owner") throw new ApiError("owner_only", "Only the project's owner connects its pipeline", 403);
    record.changelogToken = null;
    this.emit(projectId, { type: "changelog.changed", actor: YOU });
  }

  /** Your open agent windows (§4.3): the mock has no harness, so the test lever opens them. */

  /** The mock pipeline presenting a token: only the project's current one records. */
  ingestChangelog(token: string, change: { ref: string; title: string; url?: string; areas?: string[] }): ChangelogEntry {
    const record = [...this.records.values()].find((r) => r.changelogToken?.token === token);
    if (!record) throw new ApiError("invalid_token", "This token records nothing", 401);
    return this.recordChangelogEntry(record.project.id, change, { kind: "agent", accountId: "acc-you", name: "Pipeline", agentName: "Pipeline" });
  }
}
