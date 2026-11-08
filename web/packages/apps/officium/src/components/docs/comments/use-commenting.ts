"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createCommentAnchors, keepsMarkdown, type AnchorReport, type AnchorThread, type CommentAnchors } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { DocPage, DocQuote } from "../../../lib/backlog/types";
import { useCurrentAccountId } from "../../../lib/backlog/use-current-account";
import { useDocComments, type DocComments } from "../../../lib/docs/use-doc-comments";

/**
 * The passage whose comments show in the popover over the text (JAVA-1538): a thread's (`threadId`), or the selection a
 * new thread is being written about (`threadId` null, see `composing`). Peeked by hovering, pinned by a click.
 */
export interface PassageView {
  threadId: string | null;
  pinned: boolean;
}

/** Everything a page's reading and editing views share about its comments (JAVA-797, JAVA-1538). */
export interface Commenting {
  projectId: string;
  comments: DocComments;
  me: string | undefined;
  canWrite: boolean;
  owner: boolean;
  /** Why nobody can comment on this page, in words, or `null`. */
  readOnlyReason: string | null;
  /** Why a selection can't start a comment though page comments work, or `null`. */
  selectionReason: string | null;
  openCount: number;
  /** The open threads that quote the page: what the text draws. */
  anchorThreads: AnchorThread[];
  /** The editor's extension and its controller. */
  anchors: CommentAnchors;
  /** Thread ids the live editor found words for, in page order; `null` until it has looked. */
  editorAnchored: string[] | null;
  composing: DocQuote | null;
  /** Opens the popover on a new thread about `quote`, keeping `range` drawn in the text. */
  startComposing: (quote: DocQuote, range: { from: number; to: number }) => void;
  stopComposing: () => void;
  passage: PassageView | null;
  /** A passage hovered: shown until the pointer leaves, unless one is pinned. */
  peek: (id: string) => void;
  /** The pointer left the passage and its popover: an unpinned one closes. */
  unpeek: () => void;
  /** A passage clicked (or a press inside its popover): it stays open to reply or comment. */
  openThread: (id: string) => void;
  pin: () => void;
  closePassage: () => void;
}

/**
 * The comments of the open page (JAVA-797): its threads (kept live), the passage popover's state (JAVA-1538), the
 * selection a new thread is being written about, and the editor extension that draws the open threads' words. The page
 * that owns it is keyed by path, so each page starts clean.
 */
export function useCommenting({ repository, projectId, path, page, canWrite, owner }: {
  repository: BacklogRepository;
  projectId: string;
  path: string;
  /** Null while the page loads. */
  page: DocPage | null;
  canWrite: boolean;
  owner: boolean;
}): Commenting {
  const me = useCurrentAccountId();
  const comments = useDocComments(repository, projectId, path, page !== null && !page.builtin);
  const [composing, setComposing] = useState<DocQuote | null>(null);
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [report, setReport] = useState<AnchorReport | null>(null);

  const openThread = useCallback((id: string) => setPassage({ threadId: id, pinned: true }), []);
  const peek = useCallback((id: string) => setPassage((was) => (was?.pinned ? was : { threadId: id, pinned: false })), []);
  const unpeek = useCallback(() => setPassage((was) => (was?.pinned ? was : null)), []);
  const pin = useCallback(() => setPassage((was) => (was ? { ...was, pinned: true } : was)), []);
  const [anchors] = useState(() => createCommentAnchors({ onOpen: openThread, onReport: setReport }));

  const anchorThreads = useMemo(
    () => comments.threads.flatMap((t) => (t.resolvedAt || !t.quote ? [] : [{ id: t.id, quote: t.quote }])),
    [comments.threads],
  );
  useEffect(() => anchors.setThreads(anchorThreads), [anchors, anchorThreads]);
  const stopComposing = useCallback(() => {
    anchors.setPending(null);
    setComposing(null);
    setPassage((was) => (was?.threadId === null ? null : was));
  }, [anchors]);
  const closePassage = useCallback(() => {
    // Only a selection being commented on is drawn: closing a thread's popover sends the editor nothing.
    if (composing) anchors.setPending(null);
    setComposing(null);
    setPassage(null);
  }, [anchors, composing]);
  const startComposing = useCallback((quote: DocQuote, range: { from: number; to: number }) => {
    anchors.setPending(range);
    setComposing(quote);
    setPassage({ threadId: null, pinned: true });
  }, [anchors]);

  const archived = page !== null && page.archivedAt !== null;
  const readOnlyReason = !canWrite ? "Commenting needs editor access." : archived ? "Unarchive this page to comment." : null;
  const selectionReason = !readOnlyReason && page !== null && !keepsMarkdown(page.body) ? "Selection comments need the visual editor. Page comments still work." : null;

  return {
    projectId, comments, me, canWrite: canWrite && !archived, owner, readOnlyReason, selectionReason,
    openCount: comments.threads.filter((t) => !t.resolvedAt).length, anchorThreads, anchors,
    editorAnchored: report ? report.anchored : null, composing, startComposing, stopComposing,
    passage, peek, unpeek, openThread, pin, closePassage,
  };
}
