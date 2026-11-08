"use client";

import type { ReactNode } from "react";
import { Bot, Reply } from "lucide-react";

import { Button, Text } from "@javadaba/ui";
import { MarkdownView } from "@javadaba/rich-text";

import type { Actor, Comment } from "../../lib/backlog/types";
import { formatDate } from "../../lib/backlog/format";
import { ClampedText, CollapsedList } from "./Collapsed";

/**
 * A card's comments as threads (JAVA-524): a comment may answer another, and the answers are
 * drawn as a staircase, each level under its parent with a thread line, as Reddit does. Under each
 * comment its first reply shows and the rest sit behind "Show N more replies" (Jira-like).
 */

/** Levels that indent. Deeper replies keep the thread line they are on without moving further
 *  right, so a long thread still leaves the text room on a phone (layout floor L6). */
const INDENTED_LEVELS = 3;

/** How many replies a comment shows before "Show N more replies". */
const VISIBLE_REPLIES = 1;

export interface Thread {
  comment: Comment;
  /** Oldest first: a conversation reads down. */
  replies: Thread[];
}

/** The flat list the API returns, oldest first, as threads. A reply whose parent is gone (it was
 *  deleted) stands at the top level, which is where the API's `on delete set null` puts it too. */
export function buildThreads(comments: readonly Comment[]): Thread[] {
  const byId = new Map(comments.map((comment) => [comment.id, { comment, replies: [] as Thread[] }]));
  const roots: Thread[] = [];
  for (const thread of byId.values()) {
    const parent = thread.comment.parentId ? byId.get(thread.comment.parentId) : undefined;
    (parent ? parent.replies : roots).push(thread);
  }
  return roots;
}

/** Whether the thread holds any of `ids`: a collapsed list never hides what the viewer just posted. */
export function holdsAny(thread: Thread, ids: readonly string[]): boolean {
  return ids.includes(thread.comment.id) || thread.replies.some((reply) => holdsAny(reply, ids));
}

/** Who did something, the way the history reads it: an agent by its client's name, with its icon. */
export function ActorName({ actor }: { actor: Actor }) {
  return actor.kind === "agent" ? (
    <span className="flex flex-row items-center gap-1">
      <Bot size={12} aria-hidden="true" /> {actor.agentName ?? actor.name}
    </span>
  ) : (
    <>{actor.name}</>
  );
}

export function CommentThread({
  thread,
  depth = 0,
  postedIds,
  replyingTo,
  onReply,
  renderComposer,
}: {
  thread: Thread;
  depth?: number;
  /** What the viewer posted in this view: shown whole, and never collapsed away. */
  postedIds: readonly string[];
  /** The comment whose reply composer is open, if any. */
  replyingTo: string | null;
  onReply: (commentId: string) => void;
  /** The reply composer, drawn under the comment it answers. */
  renderComposer: (commentId: string) => ReactNode;
}) {
  const { comment, replies } = thread;
  const author = comment.author.agentName ?? comment.author.name;
  const open = replyingTo === comment.id;
  return (
    <div className="flex flex-col gap-1">
      <article className="flex flex-row gap-3" aria-label={`Comment by ${author}`}>
        <div className="flex flex-row size-8 shrink-0 items-center justify-center rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-ink)]/[0.08] text-xs font-bold text-[color:var(--jd-ink)]" aria-hidden="true">
          {comment.author.kind === "agent" ? <Bot size={14} /> : comment.author.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1 rounded-[var(--radius-jd-lg)] rounded-tl-none border border-[color:var(--jd-line)] p-3">
          <div className="mb-1 flex flex-row items-center justify-between gap-2">
            <span className="text-xs font-semibold">
              <ActorName actor={comment.author} />
            </span>
            <time dateTime={comment.createdAt} className="shrink-0 text-xs font-medium text-[color:var(--jd-muted)]">
              {formatDate(comment.createdAt.slice(0, 10))}
            </time>
          </div>
          <ClampedText initiallyExpanded={postedIds.includes(comment.id)}>
            <MarkdownView markdown={comment.text} className="text-sm leading-relaxed text-[color:var(--jd-ink)]/85" />
          </ClampedText>
        </div>
      </article>
      {/* Outside the article, like the thread under it: the article is the comment's own words. */}
      <div className="flex flex-row pl-11">
        <Button
          type="button"
          register="ui"
          size="sm"
          variant="ghost"
          className="h-11"
          aria-label={`Reply to ${author}`}
          aria-expanded={open}
          onClick={() => onReply(comment.id)}
        >
          <Reply size={14} aria-hidden="true" />
          <Text>Reply</Text>
        </Button>
      </div>
      {open && <div className="flex flex-col pl-11">{renderComposer(comment.id)}</div>}
      {replies.length > 0 && (
        <CollapsedList
          // The line sits under the avatar's centre (size-8, so 1rem in), as a thread line does.
          className={
            depth < INDENTED_LEVELS
              ? "ml-4 flex flex-col gap-3 border-l-2 border-[color:var(--jd-line)] pl-3"
              : "flex flex-col gap-3"
          }
          aria-label={`Replies to ${author}`}
          items={replies}
          visible={VISIBLE_REPLIES}
          itemKey={(reply) => reply.comment.id}
          pinned={(reply) => holdsAny(reply, postedIds)}
          moreLabel={(hidden) => `Show ${hidden} more ${hidden === 1 ? "reply" : "replies"}`}
          renderItem={(reply) => (
            <CommentThread
              thread={reply}
              depth={depth + 1}
              postedIds={postedIds}
              replyingTo={replyingTo}
              onReply={onReply}
              renderComposer={renderComposer}
            />
          )}
        />
      )}
    </div>
  );
}
