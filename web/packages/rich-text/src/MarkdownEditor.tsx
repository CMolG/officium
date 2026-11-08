"use client";

import { useState, type KeyboardEvent } from "react";
import { FileCode2 } from "lucide-react";

import { Textarea } from "@javadaba/ui";

import { keepsMarkdown } from "./markdown";
import { ToolbarButton, type ToolbarControl, type ToolbarLabels } from "./toolbar";
import { Notice } from "./Notice";
import { hasTableAlignment, TABLE_ALIGNMENT_NOTICE } from "./source-notices";
import { isSubmitKey, VisualEditor } from "./VisualEditor";

export interface MarkdownChange {
  /** The text to store. Byte for byte the original while the person has changed nothing. */
  markdown: string;
  /** Whether it differs from the `value` the editor opened with. */
  changed: boolean;
}

export interface MarkdownEditorLabels {
  /** The toggle between the visual editor and the Markdown source. */
  sourceToggle: string;
  /** Why a text opened as Markdown source. */
  sourceNotice: string;
  /** Shown in the visual editor when the text opens with frontmatter, which it keeps as written. */
  frontmatterNotice: string;
  /** Shown over the source when a table aligns a column, which only the source can hold. */
  tableAlignmentNotice: string;
}

export interface MarkdownEditorProps {
  /** The stored Markdown the editor opens with. Read once, on mount: to start over, remount it. */
  value: string;
  onChange: (change: MarkdownChange) => void;
  /** The editable area's accessible name ("Description", "Comment"). */
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** ⌘/Ctrl+Enter, in both modes. */
  onSubmit?: () => void;
  /** `full` for a document-like field, `compact` for a comment box. */
  controls?: "full" | "compact";
  labels?: Partial<ToolbarLabels & MarkdownEditorLabels>;
  className?: string;
  /** The text area's own classes -- its minimum height, mostly. */
  contentClassName?: string;
  "data-testid"?: string;
}

const CONTROLS: Record<"full" | "compact", ToolbarControl[]> = {
  full: [
    "blockType", "|", "bold", "italic", "strike", "code", "|", "bulletList", "orderedList", "taskList", "|",
    "blockquote", "codeBlock", "|", "link", "|", "undo", "redo",
  ],
  compact: ["bold", "italic", "strike", "code", "|", "bulletList", "orderedList", "taskList", "|", "blockquote", "codeBlock", "link"],
};

const DEFAULT_LABELS: MarkdownEditorLabels = {
  // Not "Edit as Markdown": a host page's own "Edit" button must stay the only thing named Edit.
  sourceToggle: "Markdown source",
  sourceNotice:
    "This text uses Markdown the visual editor can't keep exactly, so it opens as Markdown. "
    + "The visual editor may reformat it.",
  frontmatterNotice: "This page's metadata (its frontmatter) is kept as written. To change it, open the Markdown source.",
  tableAlignmentNotice: TABLE_ALIGNMENT_NOTICE,
};

/**
 * The ecosystem's Markdown field: Fabula's editor and controls over a Markdown document, with the
 * Markdown source one click away.
 *
 * Two promises, both because a card's text is written by agents in Markdown the visual editor did
 * not produce:
 *
 * - **Untouched means untouched.** While the document the person sees is the one it opened with,
 *   `onChange` hands back the ORIGINAL string, not a re-serialisation of it. Saving without
 *   editing cannot rewrite an agent's Markdown (and cannot count as an edit).
 * - **What the visual editor would damage opens as source.** `keepsMarkdown` checks the round
 *   trip on mount; a text that would not survive it opens in Markdown mode, and says why.
 *
 * A leading frontmatter block (a documentation page's metadata, JAVA-782) is not part of the
 * visual document: the visual editor writes it back byte for byte in front of whatever it
 * serialises, and the Markdown source is where it is edited.
 */
export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  autoFocus = false,
  onSubmit,
  controls = "full",
  labels: labelOverrides,
  className,
  contentClassName = "min-h-32",
  "data-testid": testId,
}: MarkdownEditorProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [lossy] = useState(() => !keepsMarkdown(value));
  const [mode, setMode] = useState<"visual" | "source">(lossy ? "source" : "visual");
  // The latest text, whichever mode produced it: what the other mode opens with on a switch.
  const [current, setCurrent] = useState(value);
  // Focus follows the person into the mode they switch to, not only on the first mount.
  const [focusOnMount, setFocusOnMount] = useState(autoFocus);

  const emit = (markdown: string) => {
    setCurrent(markdown);
    onChange({ markdown, changed: markdown !== value });
  };

  const toggle = (
    <ToolbarButton
      active={mode === "source"}
      onClick={() => {
        setFocusOnMount(true);
        setMode((m) => (m === "visual" ? "source" : "visual"));
      }}
      title={labels.sourceToggle}
      icon={FileCode2}
      className="ml-auto"
    />
  );

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--jd-focus)] ${className ?? ""}`}
      data-testid={testId}
      data-mode={mode}
    >
      {mode === "visual" ? (
        <VisualEditor
          initial={current}
          label={label}
          placeholder={placeholder}
          autoFocus={focusOnMount}
          onSubmit={onSubmit}
          controls={CONTROLS[controls]}
          labels={labelOverrides}
          contentClassName={contentClassName}
          toggle={toggle}
          onMarkdown={emit}
          notice={lossy ? labels.sourceNotice : undefined}
          frontmatterNotice={labels.frontmatterNotice}
        />
      ) : (
        <>
          <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-row items-center gap-0.5 border-b border-[color:var(--jd-line)] px-1 py-1">
            <span className="px-2 font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest text-[color:var(--jd-muted)]">
              Markdown
            </span>
            {toggle}
          </div>
          {lossy && <Notice>{labels.sourceNotice}</Notice>}
          {hasTableAlignment(current) && <Notice>{labels.tableAlignmentNotice}</Notice>}
          <Textarea
            value={current}
            onChange={(event) => emit(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (onSubmit && isSubmitKey(event)) {
                event.preventDefault();
                onSubmit();
              }
            }}
            aria-label={`${label} (Markdown)`}
            placeholder={placeholder}
            autoFocus={focusOnMount}
            spellCheck
            className={`resize-y rounded-none border-0 font-[family-name:var(--font-jd-kicker)] text-base shadow-none focus-visible:ring-0 md:text-sm ${contentClassName}`}
          />
        </>
      )}
    </div>
  );
}
