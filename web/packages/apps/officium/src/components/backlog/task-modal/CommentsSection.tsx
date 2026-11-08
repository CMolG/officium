"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { MessageSquare, Send } from "lucide-react";

import { Button, Text } from "@javadaba/ui";
import { MarkdownEditor } from "@javadaba/rich-text";

import { useReadOnly } from "../../../lib/backlog/read-only-context";
import type { CardDetail } from "../../../lib/backlog/types";
import { CollapsedList } from "../Collapsed";
import { CommentThread, buildThreads, holdsAny } from "../CommentThreads";
import type { CardComments } from "./use-card-comments";

/** How many comments a card opens with, the most recent ones (JAVA-522). */
const VISIBLE_COMMENTS = 3;

export function CommentsSection({ detail, comments }: { detail: CardDetail; comments: CardComments }) {
  const readOnly = useReadOnly();
  const { comment, setComment, composerKey, sending, postedIds, replyingTo, setReplyTo, reply, setReply, submitComment, toggleReply } = comments;
  return (
    <section aria-label="Comments" className="border-t border-[color:var(--jd-line)] pt-4">
      <h3 className="mb-4 flex flex-row items-center gap-2 text-sm font-bold uppercase tracking-wide">
        <MessageSquare size={16} /> Comments
      </h3>
      <div className="mb-4 flex flex-col">
        {detail.comments.length > 0 ? (
          // JAVA-522: newest first, the three most recent threads shown and the rest behind
          // one button, each long comment clamped. JAVA-524: each comment carries its
          // replies as a staircase. Keyed by card: this modal can switch to a linked card
          // without remounting, and that card opens collapsed.
          <CollapsedList
            key={detail.id}
            className="flex flex-col gap-4"
            items={buildThreads(detail.comments).reverse()}
            visible={VISIBLE_COMMENTS}
            itemKey={(thread) => thread.comment.id}
            pinned={(thread) => holdsAny(thread, postedIds)}
            moreLabel={(hidden) => `Show ${hidden} older comment${hidden === 1 ? "" : "s"}`}
            renderItem={(thread) => (
              <CommentThread
                thread={thread}
                postedIds={postedIds}
                replyingTo={replyingTo}
                onReply={toggleReply}
                renderComposer={(parentId) => (
                  <div className="flex flex-col gap-2">
                    <MarkdownEditor
                      // Opens on the draft it holds: switching to a linked card and back
                      // remounts this editor, and Send must post only what it shows.
                      value={reply}
                      onChange={({ markdown }) => setReply(markdown)}
                      onSubmit={() => void submitComment(parentId)}
                      label="Reply"
                      placeholder="Write a reply…"
                      controls="compact"
                      contentClassName="min-h-12"
                      data-testid="reply-editor"
                    />
                    <div className="flex flex-row justify-end gap-2">
                      <Button type="button" register="ui" size="sm" variant="ghost" className="h-11" onClick={() => setReplyTo(null)}>
                        <Text>Cancel</Text>
                      </Button>
                      <Button
                        type="button"
                        register="ui"
                        size="sm"
                        className="h-11"
                        disabled={!reply.trim() || sending}
                        title={reply.trim() ? "Send (⌘/Ctrl+Enter)" : "Write something to send"}
                        onClick={() => void submitComment(parentId)}
                      >
                        <Send size={14} aria-hidden="true" />
                        <Text>Send reply</Text>
                      </Button>
                    </div>
                  </div>
                )}
              />
            )}
          />
        ) : (
          <p className="rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] py-4 text-center text-sm font-medium italic text-[color:var(--jd-muted)]">
            No comments yet. Be the first.
          </p>
        )}
      </div>
      {readOnly ? (
        <p className="mt-2 text-sm text-[color:var(--jd-muted)]">You can read the comments. Ask the project's owner for editor access to write one.</p>
      ) : (
        <>
        <div className="flex flex-row items-end gap-2">
          <MarkdownEditor
            key={composerKey}
            value=""
            onChange={({ markdown }) => setComment(markdown)}
            onSubmit={() => void submitComment()}
            label="Comment"
            placeholder="Write a comment…"
            controls="compact"
            className="min-w-0 flex-1"
            contentClassName="min-h-16"
            data-testid="comment-editor"
          />
          <Button
            type="button"
            register="ui"
            size="icon"
            className="size-11"
            disabled={!comment.trim() || sending}
            title={comment.trim() ? "Send (⌘/Ctrl+Enter)" : "Write something to send"}
            onClick={() => void submitComment()}
            aria-label="Send comment"
          >
            <Send size={18} />
          </Button>
        </div>
        <p className="mt-2 text-xs text-[color:var(--jd-muted)]">Formatting and Markdown both work. ⌘/Ctrl+Enter sends.</p>
        </>
      )}
    </section>
  );
}
