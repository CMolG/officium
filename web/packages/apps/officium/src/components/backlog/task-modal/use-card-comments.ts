"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useState } from "react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { CardDetail } from "../../../lib/backlog/types";
import type { OnChanged } from "./types";

export interface CardCommentsInput {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onChanged: OnChanged;
  setError: (message: string | null) => void;
}

/** The comment composer, the reply composer and what the viewer has posted in this view. */
export function useCardComments({ projectId, repository, detail, onChanged, setError }: CardCommentsInput) {
  const [comment, setComment] = useState("");
  // A fresh composer after each comment: the editor reads its text once, on mount.
  const [composerKey, setComposerKey] = useState(0);
  const [sending, setSending] = useState(false);
  // What the viewer posted in this view shows whole (JAVA-522): they just wrote it.
  const [postedIds, setPostedIds] = useState<string[]>([]);
  // The comment whose reply composer is open (JAVA-524), keyed by card like `removed` below.
  const [replyTo, setReplyTo] = useState<{ cardId: string; commentId: string } | null>(null);
  const replyingTo = replyTo?.cardId === detail.id ? replyTo.commentId : null;
  const [reply, setReply] = useState("");

  /** A top-level comment, or with `parentId` a reply to that comment (JAVA-524). */
  async function submitComment(parentId?: string) {
    const text = (parentId ? reply : comment).trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const next = await repository.addComment(projectId, detail.id, text, parentId);
      const before = new Set(detail.comments.map((c) => c.id));
      setPostedIds((ids) => [...ids, ...next.comments.filter((c) => !before.has(c.id)).map((c) => c.id)]);
      if (parentId) {
        setReply("");
        setReplyTo(null);
      } else {
        setComment("");
        setComposerKey((k) => k + 1);
      }
      await onChanged(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : parentId ? "Couldn't post the reply." : "Couldn't post the comment.");
    } finally {
      setSending(false);
    }
  }

  function toggleReply(commentId: string) {
    setReply("");
    setReplyTo(replyingTo === commentId ? null : { cardId: detail.id, commentId });
  }

  return {
    comment,
    setComment,
    composerKey,
    sending,
    postedIds,
    replyingTo,
    setReplyTo,
    reply,
    setReply,
    submitComment,
    toggleReply,
  };
}

export type CardComments = ReturnType<typeof useCardComments>;
