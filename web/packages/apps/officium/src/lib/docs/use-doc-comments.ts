"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "../backlog/api-error";
import type { BacklogRepository } from "../backlog/repository";
import type { DocCommentInput, DocThread } from "../backlog/types";

export type DocCommentsStatus = "loading" | "ready" | "error";

/** What a refused or failed comment write says, in words a person can act on (JAVA-797). */
export function commentProblem(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "storage_quota_exceeded":
        return "The owner's storage is full, so nothing more can be added. Free some space in the documentation settings.";
      case "quote_not_found":
        return "The page changed and no longer holds those words. Select the text again.";
      case "read_only":
        return "You no longer have editor access, so this can't be saved. Copy your text before leaving.";
      case "doc_archived":
        return "This page is archived. Unarchive it to comment.";
      case "not_comment_author":
        return "Only the author can do this.";
      default:
        return err.message;
    }
  }
  return "Couldn't reach Officium. Check your connection and try again.";
}

/** The writes a thread's views start; each answers a problem to show, or `null` when it worked. */
export interface DocCommentActions {
  add: (input: DocCommentInput) => Promise<string | null>;
  edit: (commentId: string, text: string) => Promise<string | null>;
  remove: (commentId: string) => Promise<string | null>;
  resolve: (commentId: string) => Promise<string | null>;
  reopen: (commentId: string) => Promise<string | null>;
  react: (commentId: string, emoji: string) => Promise<string | null>;
  unreact: (commentId: string, emoji: string) => Promise<string | null>;
}

export interface DocComments {
  threads: DocThread[];
  status: DocCommentsStatus;
  error: string | null;
  reload: () => void;
  actions: DocCommentActions;
}

/**
 * A page's comment threads (JAVA-797): read whole, kept in step with the project's live channel -- a
 * `doc.comment` for this page, or a reconnection, reads again -- and written through `actions`, whose answers
 * replace the thread they touched so nothing waits for the echo. A re-read never drops a thread a write just
 * brought back: it replaces the list, and the server's list holds it.
 */
export function useDocComments(repository: BacklogRepository, projectId: string, path: string, enabled: boolean): DocComments {
  const [threads, setThreads] = useState<DocThread[]>([]);
  const [status, setStatus] = useState<DocCommentsStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const latest = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    return repository.subscribe(projectId, (event) => {
      if (event.type === "stream.ready" || (event.type === "doc.comment" && event.path === path)) setTick((n) => n + 1);
    });
  }, [repository, projectId, path, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const mine = ++latest.current;
    repository.listDocComments(projectId, path, "all").then(
      (list) => {
        if (mine !== latest.current) return;
        setThreads(list);
        setStatus("ready");
        setError(null);
      },
      (err) => {
        if (mine !== latest.current) return;
        setError(commentProblem(err));
        setStatus((s) => (s === "ready" ? s : "error"));
      },
    );
  }, [repository, projectId, path, enabled, tick]);

  /** `thread` replaces the one it names; `null` means the thread holding comment `goneId` is gone. */
  const land = useCallback((thread: DocThread | null, goneId?: string) => {
    latest.current++;
    setThreads((list) => {
      if (!thread) return list.filter((t) => !t.comments.some((c) => c.id === goneId));
      return list.some((t) => t.id === thread.id) ? list.map((t) => (t.id === thread.id ? thread : t)) : [...list, thread];
    });
  }, []);

  const actions = useMemo<DocCommentActions>(() => {
    const run = async (write: () => Promise<DocThread | null>, goneId?: string): Promise<string | null> => {
      try {
        land(await write(), goneId);
        return null;
      } catch (err) {
        return commentProblem(err);
      }
    };
    return {
      add: (input) => run(() => repository.addDocComment(projectId, path, input)),
      edit: (id, text) => run(() => repository.editDocComment(projectId, path, id, text)),
      remove: (id) => run(() => repository.deleteDocComment(projectId, path, id), id),
      resolve: (id) => run(() => repository.resolveDocComment(projectId, path, id)),
      reopen: (id) => run(() => repository.unresolveDocComment(projectId, path, id)),
      react: (id, emoji) => run(() => repository.reactDocComment(projectId, path, id, emoji)),
      unreact: (id, emoji) => run(() => repository.unreactDocComment(projectId, path, id, emoji)),
    };
  }, [repository, projectId, path, land]);

  return { threads, status, error, reload, actions };
}
