import { canQuote, findQuote, markdownQuoteText } from "@javadaba/rich-text";

import { isBuiltinDocPath, BUILTIN_PREFIX } from "../../docs/doc-path";
import { isVisibleDoc } from "../../docs/doc-lifecycle";
import { ApiError } from "../api-error";
import type { DocCommentInput, DocCommentState, DocQuote, DocReaction, DocThread } from "../doc-comment-types";
import { newId } from "../format";
import { YOU } from "../memory-seed";
import type { Actor, DocPage } from "../types";
import { MemoryDocTemplates } from "./doc-templates";
import { now } from "./rules";

interface Row {
  id: string;
  pageId: string;
  parentId: string | null;
  author: Actor;
  text: string;
  quote: DocQuote | null;
  resolvedAt: string | null;
  resolvedBy: Actor | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Reacted {
  commentId: string;
  emoji: string;
  accountId: string;
  name: string;
  at: string;
}

const bytes = (...values: (string | null)[]) => values.reduce((sum, value) => sum + (value ? new TextEncoder().encode(value).length : 0), 0);
const rowBytes = (row: Row) => bytes(row.text, row.quote?.exact ?? null, row.quote?.prefix ?? null, row.quote?.suffix ?? null);
const notFound = () => new ApiError("comment_not_found", "No such comment", 404);

/**
 * A page's comment threads as the API answers them (JAVA-797), without a server: the permission matrix, the
 * tombstone, the reopening reply and the quote check are made here by the same rules, and the quote is matched on the
 * page's Markdown with the same words rule (`@javadaba/rich-text`'s `findQuote`). Comments are keyed by page id, so a
 * move keeps them.
 */
export class MemoryDocComments extends MemoryDocTemplates {
  private readonly rows: Row[] = [];
  private readonly reactions: Reacted[] = [];
  private readonly full = new Set<string>();

  /** The owner's storage running out: every write that adds text is refused (`storage_quota_exceeded`) until it is cleared. */
  setDocStorageFull(projectId: string, full: boolean): void {
    if (full) this.full.add(projectId);
    else this.full.delete(projectId);
  }

  protected override commentBytes(projectId: string): number {
    const ids = new Set([...this.requireRecord(projectId).docs.values()].map((page) => page.id));
    return this.rows.filter((row) => ids.has(row.pageId)).reduce((sum, row) => sum + rowBytes(row), 0);
  }

  /** The page a comment belongs to; `write` is the editor's and refuses what the API refuses. */
  private commentPage(projectId: string, rawPath: string, write: boolean): DocPage {
    const record = this.requireRecord(projectId);
    const path = this.requireDocPath(rawPath);
    if (write) {
      if (isBuiltinDocPath(path)) {
        throw new ApiError("builtin_doc_read_only", `Pages under "${BUILTIN_PREFIX}/" are Officium's own documentation: they take no comments`, 403);
      }
      this.requireEditor(projectId);
    }
    const page = record.docs.get(path) ?? this.followRedirect(record, path)?.page;
    if (!page || !isVisibleDoc(page, YOU.accountId)) throw new ApiError("doc_not_found", "No such page", 404);
    if (write && page.archivedAt) throw new ApiError("doc_archived", `"${page.path}" is archived: unarchive it first`, 409);
    return page;
  }

  private find(page: DocPage, commentId: string): Row {
    const row = this.rows.find((r) => r.id === commentId && r.pageId === page.id);
    if (!row) throw notFound();
    return row;
  }

  private rootOf(page: DocPage, commentId: string): Row {
    const row = this.find(page, commentId);
    return row.parentId ? this.find(page, row.parentId) : row;
  }

  private groups(commentId: string): DocReaction[] {
    const byEmoji = new Map<string, Reacted[]>();
    this.reactions.filter((r) => r.commentId === commentId).sort((a, b) => a.at.localeCompare(b.at))
      .forEach((r) => byEmoji.set(r.emoji, [...(byEmoji.get(r.emoji) ?? []), r]));
    return [...byEmoji].map(([emoji, list]) => ({ emoji, by: list.map((r) => ({ accountId: r.accountId, name: r.name })) }));
  }

  private threadsOf(page: DocPage): DocThread[] {
    const mine = this.rows.filter((r) => r.pageId === page.id);
    const text = markdownQuoteText(page.body);
    return mine.filter((r) => !r.parentId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).flatMap((root) => {
      const replies = mine.filter((r) => r.parentId === root.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      if (root.deletedAt && replies.length === 0) return [];
      const entry = (r: Row) => ({
        id: r.id, author: r.author, text: r.deletedAt ? "" : r.text, createdAt: r.createdAt, updatedAt: r.updatedAt,
        deleted: Boolean(r.deletedAt), reactions: r.deletedAt ? [] : this.groups(r.id),
      });
      return [{
        id: root.id, path: page.path, pageTitle: page.title, quote: root.quote,
        detached: root.quote !== null && findQuote(text, root.quote) === null,
        resolvedAt: root.resolvedAt, resolvedBy: root.resolvedBy, comments: [root, ...replies].map(entry),
      }];
    });
  }

  private threadOf(page: DocPage, rootId: string): DocThread | null {
    return this.threadsOf(page).find((t) => t.id === rootId) ?? null;
  }

  private announce(projectId: string, page: DocPage, actor: Actor): void {
    if (page.publishedAt) this.emit(projectId, { type: "doc.comment", path: page.path, actor });
  }

  private keep(state: DocCommentState, thread: DocThread): boolean {
    return state === "all" || (state === "open") === (thread.resolvedAt === null);
  }

  async listDocComments(projectId: string, rawPath: string, state: DocCommentState = "open"): Promise<DocThread[]> {
    this.requireRecord(projectId);
    if (isBuiltinDocPath(this.requireDocPath(rawPath))) return [];
    return this.threadsOf(this.commentPage(projectId, rawPath, false)).filter((t) => this.keep(state, t));
  }

  async listProjectDocComments(projectId: string, state: DocCommentState = "open", limit = 50): Promise<DocThread[]> {
    const pages = [...this.requireRecord(projectId).docs.values()].filter((p) => isVisibleDoc(p, YOU.accountId) && !p.archivedAt);
    const last = (t: DocThread) => t.comments.reduce((latest, c) => (c.updatedAt > latest ? c.updatedAt : latest), t.resolvedAt ?? "");
    return pages.flatMap((page) => this.threadsOf(page)).filter((t) => this.keep(state, t))
      .sort((a, b) => last(b).localeCompare(last(a))).slice(0, Math.max(1, limit));
  }

  async addDocComment(projectId: string, rawPath: string, input: DocCommentInput, actor: Actor = YOU): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const text = input.text?.trim();
    if (!text) throw new ApiError("text_required", "A comment needs text", 400);
    let parent: Row | null = null;
    if (input.parentId) {
      parent = this.find(page, input.parentId);
      if (parent.parentId) throw new ApiError("reply_to_reply", `Reply to the thread's first comment (${parent.parentId}), not to a reply`, 400);
      if (input.quote) throw new ApiError("reply_has_quote", "A reply has no quote: it belongs to its thread", 400);
    }
    if (input.quote && (!canQuote(input.quote.exact) || findQuote(markdownQuoteText(page.body), input.quote) === null)) {
      throw new ApiError("quote_not_found", "The page no longer holds those words: select the text again", 400);
    }
    if (this.full.has(projectId)) throw new ApiError("storage_quota_exceeded", "This project's owner has used the storage available to Officium", 403);
    const at = now();
    const row: Row = {
      id: newId("cmt"), pageId: page.id, parentId: parent?.id ?? null, author: actor, text, quote: parent ? null : (input.quote ?? null),
      resolvedAt: null, resolvedBy: null, deletedAt: null, createdAt: at, updatedAt: at,
    };
    this.rows.push(row);
    if (parent?.resolvedAt) Object.assign(parent, { resolvedAt: null, resolvedBy: null });
    this.announce(projectId, page, actor);
    return this.threadOf(page, parent?.id ?? row.id) as DocThread;
  }

  async editDocComment(projectId: string, rawPath: string, commentId: string, text: string): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const row = this.find(page, commentId);
    if (row.deletedAt || row.author.accountId !== YOU.accountId) throw new ApiError("not_comment_author", "Only the author edits a comment", 403);
    if (!text.trim()) throw new ApiError("text_required", "A comment needs text", 400);
    if (text.trim() !== row.text) {
      if (this.full.has(projectId)) throw new ApiError("storage_quota_exceeded", "This project's owner has used the storage available to Officium", 403);
      Object.assign(row, { text: text.trim(), updatedAt: now() });
      this.announce(projectId, page, YOU);
    }
    return this.threadOf(page, this.rootOf(page, commentId).id) as DocThread;
  }

  async deleteDocComment(projectId: string, rawPath: string, commentId: string): Promise<DocThread | null> {
    const page = this.commentPage(projectId, rawPath, true);
    const row = this.find(page, commentId);
    const owner = this.requireRecord(projectId).project.role === "owner";
    if (!owner && row.author.accountId !== YOU.accountId) throw new ApiError("not_comment_author", "Only the author or the project owner deletes a comment", 403);
    const root = this.rootOf(page, commentId);
    const remove = (id: string) => {
      this.rows.splice(this.rows.findIndex((r) => r.id === id), 1);
      this.reactions.splice(0, this.reactions.length, ...this.reactions.filter((r) => r.commentId !== id));
    };
    if (!row.parentId && this.rows.some((r) => r.parentId === row.id)) {
      Object.assign(row, { text: "", deletedAt: now(), updatedAt: now() });
      this.reactions.splice(0, this.reactions.length, ...this.reactions.filter((r) => r.commentId !== row.id));
    } else {
      if (!row.parentId) this.rows.filter((r) => r.parentId === row.id).forEach((r) => remove(r.id));
      remove(row.id);
      if (row.parentId && root.deletedAt && !this.rows.some((r) => r.parentId === root.id)) remove(root.id);
    }
    this.announce(projectId, page, YOU);
    return this.threadOf(page, root.id);
  }

  async resolveDocComment(projectId: string, rawPath: string, commentId: string): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const root = this.rootOf(page, commentId);
    if (!root.resolvedAt) {
      Object.assign(root, { resolvedAt: now(), resolvedBy: YOU });
      this.announce(projectId, page, YOU);
    }
    return this.threadOf(page, root.id) as DocThread;
  }

  async unresolveDocComment(projectId: string, rawPath: string, commentId: string): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const root = this.rootOf(page, commentId);
    if (root.resolvedAt) {
      Object.assign(root, { resolvedAt: null, resolvedBy: null });
      this.announce(projectId, page, YOU);
    }
    return this.threadOf(page, root.id) as DocThread;
  }

  async reactDocComment(projectId: string, rawPath: string, commentId: string, emoji: string): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const row = this.find(page, commentId);
    if (row.deletedAt) throw notFound();
    if (!/\p{Extended_Pictographic}/u.test(emoji) || [...new Intl.Segmenter().segment(emoji)].length !== 1) {
      throw new ApiError("invalid_reaction", "A reaction is exactly one emoji", 400);
    }
    if (!this.reactions.some((r) => r.commentId === row.id && r.emoji === emoji && r.accountId === YOU.accountId)) {
      this.reactions.push({ commentId: row.id, emoji, accountId: YOU.accountId, name: YOU.name, at: now() });
      this.announce(projectId, page, YOU);
    }
    return this.threadOf(page, this.rootOf(page, commentId).id) as DocThread;
  }

  async unreactDocComment(projectId: string, rawPath: string, commentId: string, emoji: string): Promise<DocThread> {
    const page = this.commentPage(projectId, rawPath, true);
    const row = this.find(page, commentId);
    const index = this.reactions.findIndex((r) => r.commentId === row.id && r.emoji === emoji && r.accountId === YOU.accountId);
    if (index >= 0) {
      this.reactions.splice(index, 1);
      this.announce(projectId, page, YOU);
    }
    return this.threadOf(page, this.rootOf(page, commentId).id) as DocThread;
  }
}
