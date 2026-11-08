"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";
import { configurationPath } from "../../../lib/configuration/places";
import { MarkdownEditor } from "@javadaba/rich-text";

import type { DocQuote } from "../../../lib/backlog/types";

/**
 * Where a comment is written (JAVA-797): the words it is about when it starts a thread, a Markdown field, and
 * Post, disabled with its reason while there is nothing to post. A failure is an alert that keeps the text; a
 * full allowance links to where the space goes. Posting clears the field and keeps the focus where it was.
 */
export function DocCommentComposer({
  projectId, label, placeholder, quote, submitLabel = "Post", onSubmit, onCancel, autoFocus = false,
}: {
  projectId: string;
  label: string;
  placeholder: string;
  /** The words this comment is about, shown above the field. */
  quote?: DocQuote;
  submitLabel?: string;
  /** Resolves to the problem to show, or `null` when it posted. */
  onSubmit: (text: string) => Promise<string | null>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [fieldKey, setFieldKey] = useState(0);
  const [posting, setPosting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const blank = !text.trim();

  async function post() {
    if (blank || posting) return;
    setPosting(true);
    setProblem(null);
    const failed = await onSubmit(text.trim());
    setPosting(false);
    if (failed) {
      setProblem(failed);
      return;
    }
    setText("");
    setFieldKey((n) => n + 1);
  }

  return (
    <form
      className="flex flex-col gap-2"
      aria-label={label}
      onSubmit={(event) => {
        event.preventDefault();
        void post();
      }}
    >
      {quote && (
        <blockquote className="line-clamp-3 border-l-2 border-[color:var(--jd-line)] pl-2 text-xs italic text-[color:var(--jd-muted)]" data-testid="comment-quote">
          {quote.exact}
        </blockquote>
      )}
      <MarkdownEditor
        key={fieldKey}
        value=""
        onChange={({ markdown }) => setText(markdown)}
        onSubmit={() => void post()}
        label={label}
        placeholder={placeholder}
        controls="compact"
        autoFocus={autoFocus || fieldKey > 0}
        contentClassName="min-h-12"
        data-testid="doc-comment-editor"
      />
      {problem && (
        <p role="alert" className="text-sm font-medium text-destructive" data-testid="doc-comment-problem">
          {problem}{" "}
          {problem.includes("storage is full") && (
            <Link href={configurationPath("documentation", projectId)} className="underline underline-offset-2">
              See what takes the space
            </Link>
          )}
        </p>
      )}
      <div className="flex flex-row items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={onCancel}>
            <Text>Cancel</Text>
          </Button>
        )}
        <Button
          type="submit"
          register="ui"
          size="sm"
          className="min-h-11"
          disabled={blank || posting}
          title={blank ? "Write something to post" : "Post (⌘/Ctrl+Enter)"}
        >
          <Send size={14} aria-hidden="true" />
          <Text>{posting ? "Posting…" : submitLabel}</Text>
        </Button>
      </div>
    </form>
  );
}
