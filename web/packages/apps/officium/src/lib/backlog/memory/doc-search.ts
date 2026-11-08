import type { DocSearchFilters, DocSearchResult } from "../types";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { matchDoc, snippetParts, updatedAfterOf } from "../../docs/doc-search-query";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { BUILTIN_DOCS } from "./sample-record";
import { MemoryDocFiles } from "./doc-files";

const SNIPPETS = 25;

/** The API's ranked search (JAVA-800) over the in-memory pages: `lib/docs/doc-search-query.ts` holds the rules. */
export class MemoryDocSearch extends MemoryDocFiles {
  async searchDocs(
    projectId: string,
    filters: DocSearchFilters,
    page: { offset?: number; limit?: number; signal?: AbortSignal } = {},
  ): Promise<DocSearchResult[]> {
    const text = filters.q.trim();
    if (!text) throw new ApiError("text_required", "Say what to search the pages for", 400);
    const after = updatedAfterOf(filters.updated, Date.now());
    // A template is never a search result (JAVA-801): Templates lists it.
    const own = [...this.requireRecord(projectId).docs.values()].filter((doc) => !doc.template && isVisibleDoc(doc, YOU.accountId));
    const builtin = filters.state && filters.state !== "published" ? [] : BUILTIN_DOCS.map((doc) => ({ ...doc, projectId }));
    const found = [...own, ...builtin]
      .filter((doc) => (filters.state === "archived" ? doc.archivedAt : filters.state === "unpublished" ? !doc.archivedAt && !doc.publishedAt : !doc.archivedAt))
      .filter((doc) => filters.state !== "published" || doc.publishedAt)
      .filter((doc) => !filters.collection || doc.path === filters.collection || doc.path.startsWith(`${filters.collection}/`))
      .filter((doc) => !filters.author || doc.createdBy.accountId === filters.author || doc.updatedBy.accountId === filters.author)
      .filter((doc) => !after || doc.updatedAt >= after)
      .flatMap((doc) => {
        const match = matchDoc(text, doc);
        return match ? [{ doc, match }] : [];
      })
      .sort((a, b) => Number(b.match.fullText) - Number(a.match.fullText) || Number(b.match.head) - Number(a.match.head) || a.doc.path.localeCompare(b.doc.path));
    const offset = page.offset ?? 0;
    const window = found.slice(offset, page.limit ? offset + page.limit : undefined);
    return window.map(({ doc }, index) => ({ ...summaryOf(doc), snippet: index < SNIPPETS ? snippetParts(text, doc.body) : [] }));
  }
}
