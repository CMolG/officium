import type { DocBacklinks, DocMoveInput, DocMoveResult, DocPage, DocTreeNode, VersionConflict } from "./types";

/**
 * Moving documentation (JAVA-792, officium-api.md §8.20): a move or rename of a page with its
 * subtree, a copy, and the pages that link here. Split from `BacklogRepository` so that file keeps
 * its architecture ceiling.
 */
export interface DocMoveRepository {
  /**
   * Moves or renames a page or folder with everything under it (editor+). Old paths keep answering:
   * a read of one carries `redirectedFrom`. A stale `expectedVersion` (the node's) answers the
   * conflict shape with the node as it is now; `doc_path_taken` (the message names the paths),
   * `doc_move_into_itself`, `doc_move_same_path`, `reserved_doc_path` and `builtin_doc_read_only` throw.
   */
  moveDoc(projectId: string, path: string, input: DocMoveInput): Promise<DocMoveResult | VersionConflict<DocTreeNode>>;
  /** A copy of the page (title and body) at `to`, default the first free `<path>-copy`. A create. */
  duplicateDoc(projectId: string, path: string, input?: { to?: string; title?: string }): Promise<DocPage>;
  /** The pages that link to this one, directly or through a path that moved to it. */
  getDocBacklinks(projectId: string, path: string): Promise<DocBacklinks>;
}
