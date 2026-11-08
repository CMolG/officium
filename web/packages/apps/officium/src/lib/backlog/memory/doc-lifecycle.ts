import type { DocListState, DocPage, DocPageSummary } from "../types";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { MemoryDocHistory } from "./doc-history";

const notFound = () => new ApiError("doc_not_found", "No such page", 404);

/**
 * The life of a page past its content (JAVA-793, officium-api.md §8.7), as the API has it: publish
 * an unpublished draft, archive and unarchive, and the trash with its restore and purge. A
 * transition never touches the page's `version`. Deleting and drafts live in `MemoryDocs`.
 */
export class MemoryDocLifecycle extends MemoryDocHistory {
  async listDocsIn(projectId: string, state: DocListState): Promise<DocPageSummary[]> {
    const record = this.requireRecord(projectId);
    if (state === "trash") {
      this.requireEditor(projectId);
      return [...record.docTrash.values()]
        .filter(({ page }) => isVisibleDoc(page, YOU.accountId))
        .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
        .map(({ page, deletedAt, deletedBy }) => summaryOf(page, { deletedAt, deletedBy }));
    }
    return [...record.docs.values()]
      .filter((page) => (state === "archived" ? Boolean(page.archivedAt) : !page.publishedAt && isVisibleDoc(page, YOU.accountId)))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((page) => summaryOf(page));
  }

  async publishDoc(projectId: string, rawPath: string): Promise<DocPage> {
    return this.transition(projectId, rawPath, (page) => ({ ...page, publishedAt: page.publishedAt ?? now() }));
  }

  async archiveDoc(projectId: string, rawPath: string): Promise<DocPage> {
    return this.transition(projectId, rawPath, (page) => {
      if (!page.publishedAt) {
        throw new ApiError("doc_unpublished", "An unpublished draft cannot be archived: publish it first, or delete it", 409);
      }
      return { ...page, archivedAt: page.archivedAt ?? now(), archivedBy: page.archivedBy ?? YOU };
    });
  }

  async unarchiveDoc(projectId: string, rawPath: string): Promise<DocPage> {
    return this.transition(projectId, rawPath, (page) => ({ ...page, archivedAt: null, archivedBy: null }));
  }

  async restoreDoc(projectId: string, id: string): Promise<DocPage> {
    const record = this.requireRecord(projectId);
    this.requireEditor(projectId);
    const trashed = record.docTrash.get(id);
    if (!trashed || !isVisibleDoc(trashed.page, YOU.accountId)) throw notFound();
    if (record.docs.has(trashed.page.path)) {
      throw new ApiError("doc_path_taken", `"${trashed.page.path}" has a page again: move or delete that one, or leave this one in the trash`, 409);
    }
    record.docTrash.delete(id);
    record.docs.set(trashed.page.path, trashed.page);
    this.emit(projectId, { type: "doc.changed", path: trashed.page.path, actor: YOU });
    return { ...trashed.page };
  }

  async purgeDoc(projectId: string, id: string): Promise<void> {
    const record = this.requireRecord(projectId);
    this.requireEditor(projectId);
    const trashed = record.docTrash.get(id);
    if (!trashed || !isVisibleDoc(trashed.page, YOU.accountId)) throw notFound();
    record.docTrash.delete(id);
    this.revisionsByPage.delete(id);
    this.emit(projectId, { type: "doc.changed", path: trashed.page.path, actor: YOU });
  }

  /** A viewer cannot change a page's life, nor see the trash: the API answers `403 read_only`. */
  protected requireEditor(projectId: string) {
    if (this.requireRecord(projectId).project.role === "viewer") {
      throw new ApiError("read_only", "Viewers cannot write to this project", 403);
    }
  }

  private transition(projectId: string, rawPath: string, change: (page: DocPage) => DocPage): DocPage {
    const path = this.requireWritableDocPath(projectId, rawPath);
    this.requireEditor(projectId);
    const record = this.requireRecord(projectId);
    const current = record.docs.get(path);
    if (!current || !isVisibleDoc(current, YOU.accountId)) throw notFound();
    const next = change(current);
    record.docs.set(path, next);
    this.emit(projectId, { type: "doc.changed", path, actor: YOU });
    return { ...next };
  }
}
