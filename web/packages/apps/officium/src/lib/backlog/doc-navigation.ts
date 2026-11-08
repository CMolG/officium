import type { DocRecent, DocStar, DocStarInput } from "./types";

/**
 * A person's own way through the documentation (JAVA-799, officium-api.md §8.21): what they starred
 * and what they opened last. Personal data: any member has it, a viewer too, and nobody reads
 * another person's. Split from `BacklogRepository` so that file keeps its architecture ceiling.
 */
export interface DocNavigationRepository {
  /** The caller's stars in their order. A star on a trashed page is not listed until a restore. */
  listDocStars(projectId: string): Promise<DocStar[]>;
  /**
   * Stars a page (or with `kind: "collection"` a first-level collection). Starring again keeps the
   * place unless `position` moves it. `doc_not_found`, `doc_node_not_found`, `not_a_collection`,
   * `invalid_star_kind` and `builtin_doc_read_only` throw.
   */
  starDoc(projectId: string, path: string, input?: DocStarInput): Promise<DocStar>;
  /** Idempotent: removing a star that isn't there is not an error. */
  unstarDoc(projectId: string, path: string, kind?: DocStar["kind"]): Promise<void>;
  /** The pages the caller opened, newest first; `limit` is held to 1..50. */
  listRecentDocs(projectId: string, limit?: number): Promise<DocRecent[]>;
  /** Records that the caller opened the page. Reading a page records nothing by itself. */
  recordDocView(projectId: string, path: string): Promise<void>;
}
