import type { DocSearchFilters, DocSearchResult } from "./types";

/**
 * Searching documentation (JAVA-800, officium-api.md §8.7). Split from `BacklogRepository` so that
 * file keeps its architecture ceiling.
 */
export interface DocSearchRepository {
  /** Ranked full-text search (JAVA-800, officium-api.md §8.7): `"phrase"`, `OR`, `-word`, prefixes, title and path first, an excerpt on each of a response's first 25. Without `limit`, every match. */
  searchDocs(projectId: string, filters: DocSearchFilters, page?: { offset?: number; limit?: number; signal?: AbortSignal }): Promise<DocSearchResult[]>;
}
