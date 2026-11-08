"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Reply, RotateCcw } from "lucide-react";
import { Button, Text } from "@javadaba/ui";

import type { DocThread } from "../../../lib/backlog/types";
import type { DocCommentActions } from "../../../lib/docs/use-doc-comments";
import { ActorName } from "../../backlog/CommentThreads";
import { DocCommentComposer } from "./DocCommentComposer";
import { DocCommentItem } from "./DocCommentItem";

const excerpt = (text: string) => (text.length > 60 ? `${text.slice(0, 57)}…` : text);

/**
 * One thread (JAVA-797): the words it is about (and, when they are gone from the page, a line saying so), the
 * comments, a reply box, and Resolve or Reopen. It is an `article` named by its quote. A resolved thread says who
 * resolved it; a reply reopens it, as the server does.
 */
export function DocThreadCard({ projectId, thread, me, canWrite, owner, actions, anchored, focused }: {
  projectId: string;
  thread: DocThread;
  me: string | undefined;
  canWrite: boolean;
  owner: boolean;
  actions: DocCommentActions;
  /** The editor found the words on the page now (the server's own `detached` is only for agents). */
  anchored: boolean;
  /** Opened from the page: scrolled to and outlined. */
  focused: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const first = thread.comments[0];
  const resolved = thread.resolvedAt !== null;

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  async function toggleResolved() {
    setProblem(await (resolved ? actions.reopen(thread.id) : actions.resolve(thread.id)));
  }

  return (
    <article
      ref={ref}
      id={`doc-thread-${thread.id}`}
      aria-label={thread.quote ? `Comment on “${excerpt(thread.quote.exact)}”` : "Page comment"}
      data-testid="doc-thread"
      data-resolved={resolved}
      className={`flex flex-col gap-3 rounded-[var(--radius-jd-lg)] p-3 ${focused ? "bg-[color:var(--jd-raised)] ring-2 ring-[color:var(--jd-ink)]" : "bg-[color:var(--jd-card)]"}`}
    >
      {thread.quote && (
        <div className="flex flex-col gap-0.5">
          <blockquote className="line-clamp-3 border-l-2 border-[color:var(--jd-line)] pl-2 text-xs italic text-[color:var(--jd-muted)]">{thread.quote.exact}</blockquote>
          {!anchored && <p className="text-xs font-medium text-[color:var(--jd-muted)]">This text is no longer on the page</p>}
        </div>
      )}
      {thread.comments.map((entry) => (
        <DocCommentItem key={entry.id} entry={entry} me={me} canWrite={canWrite} owner={owner} actions={actions} />
      ))}
      {resolved && thread.resolvedBy && (
        <p className="flex flex-row items-center gap-1 text-xs text-[color:var(--jd-muted)]" data-testid="doc-thread-resolved">
          <CheckCircle2 size={12} aria-hidden="true" /> Resolved by <ActorName actor={thread.resolvedBy} />
        </p>
      )}
      {problem && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </p>
      )}
      {canWrite && (
        <div className="flex flex-row flex-wrap gap-1">
          {!replying && (
            <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={() => setReplying(true)}>
              <Reply size={14} aria-hidden="true" />
              <Text>Reply</Text>
            </Button>
          )}
          <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={() => void toggleResolved()}>
            {resolved ? <RotateCcw size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
            <Text>{resolved ? "Reopen" : "Resolve"}</Text>
          </Button>
        </div>
      )}
      {replying && (
        <DocCommentComposer
          projectId={projectId}
          label="Reply"
          placeholder="Write a reply…"
          submitLabel="Send reply"
          autoFocus
          onCancel={() => setReplying(false)}
          onSubmit={async (text) => {
            const failed = await actions.add({ text, parentId: first.id });
            if (!failed) setReplying(false);
            return failed;
          }}
        />
      )}
    </article>
  );
}
