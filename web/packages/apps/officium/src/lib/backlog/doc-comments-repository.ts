import type { DocCommentInput, DocCommentState, DocThread } from "./doc-comment-types";

/**
 * The comment threads of documentation pages (JAVA-797, officium-api.md §8.25). Split from `BacklogRepository` so that
 * file keeps its architecture ceiling. Editors and owners write, viewers read; the author edits, the author or the
 * project owner deletes; archived pages are read only and Officium's own take none. Refusals throw an `ApiError`:
 * `quote_not_found`, `reply_to_reply`, `not_comment_author`, `doc_archived`, `builtin_doc_read_only`,
 * `storage_quota_exceeded`, `read_only`.
 */
export interface DocCommentsRepository {
  listDocComments(projectId: string, path: string, state?: DocCommentState): Promise<DocThread[]>;
  /** The threads of every page the caller sees, newest activity first. */
  listProjectDocComments(projectId: string, state?: DocCommentState, limit?: number): Promise<DocThread[]>;
  /** A thread (with a `quote`, or none for a page-level one) or a reply (with `parentId`). A reply reopens a resolved thread. */
  addDocComment(projectId: string, path: string, input: DocCommentInput): Promise<DocThread>;
  editDocComment(projectId: string, path: string, commentId: string, text: string): Promise<DocThread>;
  /** `null` when the whole thread went; a first comment with replies stays as a tombstone. */
  deleteDocComment(projectId: string, path: string, commentId: string): Promise<DocThread | null>;
  resolveDocComment(projectId: string, path: string, commentId: string): Promise<DocThread>;
  unresolveDocComment(projectId: string, path: string, commentId: string): Promise<DocThread>;
  reactDocComment(projectId: string, path: string, commentId: string, emoji: string): Promise<DocThread>;
  unreactDocComment(projectId: string, path: string, commentId: string, emoji: string): Promise<DocThread>;
}
