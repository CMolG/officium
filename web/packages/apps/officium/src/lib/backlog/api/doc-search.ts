import type { DocSearchFilters, DocSearchResult } from "../types";
import { updatedAfterOf } from "../../docs/doc-search-query";
import { ApiDocFiles } from "./doc-files";

/** Ranked full-text search of the documentation (JAVA-800, officium-api.md §8.7). */
export class ApiDocSearch extends ApiDocFiles {
  async searchDocs(
    projectId: string,
    filters: DocSearchFilters,
    page: { offset?: number; limit?: number; signal?: AbortSignal } = {},
  ): Promise<DocSearchResult[]> {
    const params = new URLSearchParams({ q: filters.q.trim() });
    const set = (key: string, value: string | number | undefined) => value !== undefined && value !== "" && params.set(key, String(value));
    set("collection", filters.collection);
    set("author", filters.author);
    set("updatedAfter", updatedAfterOf(filters.updated, Date.now()));
    set("state", filters.state);
    set("limit", page.limit);
    set("offset", page.offset);
    return this.request<DocSearchResult[]>(`/projects/${projectId}/docs?${params}`, { signal: page.signal });
  }
}
