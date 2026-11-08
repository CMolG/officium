"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button, Text, useConfirmDialog } from "@javadaba/ui";
import { MarkdownEditor, MarkdownView } from "@javadaba/rich-text";

import type { DocCommentEntry } from "../../../lib/backlog/types";
import { relativeUpdated } from "../../../lib/docs/relative-time";
import { useNow } from "../../../lib/docs/use-now";
import { ActorName } from "../../backlog/CommentThreads";
import { DocReactions } from "./DocReactions";

/** What a comment's writes answer: the problem to show, or `null`. */
export interface EntryActions {
  edit: (commentId: string, text: string) => Promise<string | null>;
  remove: (commentId: string) => Promise<string | null>;
  react: (commentId: string, emoji: string) => Promise<string | null>;
  unreact: (commentId: string, emoji: string) => Promise<string | null>;
}

/**
 * One comment of a thread (JAVA-797): who wrote it and when, its Markdown (rendered with no HTML), its reactions,
 * and -- for its author -- Edit, and Delete for its author or the project's owner. Delete is irreversible, so it asks.
 * A deleted first comment that still has replies reads "Comment deleted".
 */
export function DocCommentItem({ entry, me, canWrite, owner, actions }: {
  entry: DocCommentEntry;
  me: string | undefined;
  canWrite: boolean;
  owner: boolean;
  actions: EntryActions;
}) {
  const now = useNow(30_000);
  const confirm = useConfirmDialog();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const mine = entry.author.accountId === me;

  async function save() {
    if (!draft.trim() || saving) return;
    setSaving(true);
    const failed = draft.trim() === entry.text ? null : await actions.edit(entry.id, draft.trim());
    setSaving(false);
    setProblem(failed);
    if (!failed) setEditing(false);
  }

  async function remove() {
    const sure = await confirm.confirm({
      title: "Delete this comment?",
      description: "It can't be brought back. Replies to it stay in the thread.",
      confirmLabel: "Delete comment",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (sure) setProblem(await actions.remove(entry.id));
  }

  if (entry.deleted) {
    return <p className="text-sm italic text-[color:var(--jd-muted)]">Comment deleted</p>;
  }
  return (
    <div className="flex flex-col gap-1.5" data-testid="doc-comment">
      <p className="flex flex-row flex-wrap items-center gap-x-2 text-xs text-[color:var(--jd-muted)]">
        <span className="font-bold text-[color:var(--jd-ink)]">
          <ActorName actor={entry.author} />
        </span>
        <time dateTime={entry.createdAt}>{relativeUpdated(entry.createdAt, now)}</time>
        {entry.updatedAt !== entry.createdAt && <span>(edited)</span>}
      </p>
      {editing ? (
        <div className="flex flex-col gap-2">
          <MarkdownEditor value={entry.text} onChange={({ markdown }) => setDraft(markdown)} onSubmit={() => void save()} label="Edit comment" controls="compact" autoFocus contentClassName="min-h-12" />
          <div className="flex flex-row justify-end gap-2">
            <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={() => { setEditing(false); setDraft(entry.text); setProblem(null); }}>
              <Text>Cancel</Text>
            </Button>
            <Button type="button" register="ui" size="sm" className="min-h-11" disabled={!draft.trim() || saving} title={draft.trim() ? "Save (⌘/Ctrl+Enter)" : "A comment can't be empty"} onClick={() => void save()}>
              <Text>{saving ? "Saving…" : "Save"}</Text>
            </Button>
          </div>
        </div>
      ) : (
        <MarkdownView markdown={entry.text} className="text-sm leading-relaxed" />
      )}
      {problem && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {problem}
        </p>
      )}
      <DocReactions entry={entry} me={me} canWrite={canWrite} onReact={(emoji) => actions.react(entry.id, emoji)} onUnreact={(emoji) => actions.unreact(entry.id, emoji)} />
      {canWrite && !editing && (mine || owner) && (
        <div className="flex flex-row gap-1">
          {mine && (
            <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" />
              <Text>Edit</Text>
            </Button>
          )}
          <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={() => void remove()}>
            <Trash2 size={14} aria-hidden="true" />
            <Text>Delete</Text>
          </Button>
        </div>
      )}
      {confirm.dialog}
    </div>
  );
}
