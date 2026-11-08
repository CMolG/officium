import type { Actor } from "./types";

/** A W3C TextQuoteSelector (JAVA-797, officium-api.md §8.25): the words a thread is about. */
export interface DocQuote {
  exact: string;
  prefix: string;
  suffix: string;
}

export interface DocReactor {
  accountId: string;
  name: string;
}

/** One emoji and the people who reacted with it, oldest first. */
export interface DocReaction {
  emoji: string;
  by: DocReactor[];
}

/** One comment of a thread. A deleted first comment that still has replies is a tombstone: `deleted`, no text. */
export interface DocCommentEntry {
  id: string;
  author: Actor;
  text: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  reactions: DocReaction[];
}

/** A thread: its first comment, then its replies. `quote` is null on a page-level thread. */
export interface DocThread {
  id: string;
  path: string;
  pageTitle: string;
  quote: DocQuote | null;
  /** The quoted words are no longer on the page (the server's read; the editor anchors on its own text). */
  detached: boolean;
  resolvedAt: string | null;
  resolvedBy: Actor | null;
  comments: DocCommentEntry[];
}

export type DocCommentState = "open" | "resolved" | "all";

export interface DocCommentInput {
  text: string;
  /** Only on a thread's first comment. */
  quote?: DocQuote;
  /** Only on a reply: the thread's first comment. */
  parentId?: string;
}
