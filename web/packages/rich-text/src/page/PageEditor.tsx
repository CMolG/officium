"use client";

import type { Extensions } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";

import { Textarea } from "@javadaba/ui";

import { keepsMarkdown, parseMarkdown } from "../markdown";
import type { MarkdownChange } from "../MarkdownEditor";
import { Notice } from "../Notice";
import { hasTableAlignment, TABLE_ALIGNMENT_NOTICE } from "../source-notices";
import { DEFAULT_BLOCK_ITEMS, type BlockItem } from "./block-items";
import type { PageCollaboration } from "./collaboration";
import type { LinkSources } from "./links";
import type { ResolveImage } from "../markdown-image";
import { PageBar } from "./PageBar";
import { PageBody, type PageBodyApi } from "./PageBody";
import type { PageMode } from "./PageModeSwitch";
import type { SelectionAction } from "./SelectionBubble";

export interface PageEditorHandle {
  /** Loads a newer saved text, keeping the caret where it was. Not an undo step, and not an edit. */
  setMarkdown: (markdown: string) => void;
  /** The text as it stands. */
  getMarkdown: () => string;
  focus: () => void;
  /** Adds Markdown at the caret (a block after it in the visual editor), or at the end of the source (JAVA-798). */
  insertMarkdown: (markdown: string) => void;
}

export interface PageEditorProps {
  /** The stored Markdown the page opens with. Read on mount: a newer one goes in through the handle. */
  value: string;
  onChange: (change: MarkdownChange) => void;
  /** The body's accessible name. */
  label: string;
  placeholder?: string;
  /** Drawn in the bar above the body: the save status, said in words. */
  status?: ReactNode;
  /** What a page the visual editor can't keep shows until the person opens its Markdown source. */
  readView?: ReactNode;
  /** The host's items after the schema's own (JAVA-798's image and file). */
  blockItems?: readonly BlockItem[];
  selectionActions?: readonly SelectionAction[];
  linkSources?: LinkSources;
  describeLink?: (href: string) => string;
  onOpenLink?: (href: string) => void;
  /** ⌘/Ctrl+S and ⌘/Ctrl+Enter: save what is pending now. */
  onSaveNow?: () => void;
  extensions?: Extensions;
  /**
   * A live room (JAVA-803): the visual editor starts empty and shows the room's document, with each
   * person's named caret. The host seeds it once with `setMarkdown`, and only when the room says so.
   */
  collaboration?: PageCollaboration;
  /** The room is followed, not edited: a viewer's live page (JAVA-803). Needs `collaboration`. */
  readOnly?: boolean;
  /** The visual editor exists and answers the handle: a host seeding a room waits for this. */
  onEditorReady?: () => void;
  /** The URL an image's source is drawn from, for the sources the host owns (JAVA-798). */
  resolveImage?: ResolveImage;
  /** Files pasted or dropped onto the body (JAVA-798): the host uploads them and adds what it made with the handle. */
  onFiles?: (files: File[]) => void;
  /** Puts the caret at the end of the body once it is ready (a page just created). */
  autoFocus?: boolean;
  ref?: Ref<PageEditorHandle>;
  className?: string;
}

const SOURCE_NOTICE =
  "This page uses Markdown the visual editor can't keep exactly, so it is edited as Markdown. The visual editor may reformat it.";
const VISUAL_UNAVAILABLE = "The visual editor can't keep this page exactly.";
const FRONTMATTER_NOTICE = "This page's metadata (its frontmatter) is kept as written. To change it, open the Markdown source.";

/**
 * A documentation page edited where it is read (JAVA-796): no Edit mode, no Save button. The body
 * is the schema's blocks, reached with `/`, the `+` on an empty line, Markdown shortcuts and
 * pasted Markdown; selected text gets a floating toolbar; `[[` and `@` link by title.
 *
 * Undo, Redo, the modes (Visual, Markdown, Read) and who is editing live in a slim bar above the
 * body, with the host's save status. A page the visual editor can't keep exactly opens read (or as
 * Markdown when the host has no read view) and Visual rests, saying why. Untouched means untouched,
 * in every mode.
 */
export function PageEditor({
  value, onChange, label, placeholder, status, readView, blockItems = [], selectionActions, linkSources, describeLink,
  onOpenLink, onSaveNow, extensions, collaboration, readOnly, onEditorReady, resolveImage, onFiles, autoFocus, ref, className,
}: PageEditorProps) {
  const [lossy] = useState(() => !keepsMarkdown(value));
  const [mode, setMode] = useState<PageMode>(lossy ? (readView ? "read" : "source") : "visual");
  const [current, setCurrent] = useState(value);
  const latest = useRef(current);
  const [body, setBody] = useState<PageBodyApi | null>(null);
  const onReady = useCallback((api: PageBodyApi | null) => setBody(api), []);
  const items = [...DEFAULT_BLOCK_ITEMS, ...blockItems];
  const announce = useRef(onEditorReady);
  useEffect(() => {
    announce.current = onEditorReady;
  });
  useEffect(() => {
    if (body) announce.current?.();
  }, [body]);

  const emit = (markdown: string) => {
    latest.current = markdown;
    setCurrent(markdown);
    onChange({ markdown, changed: markdown !== value });
  };

  useImperativeHandle(
    ref,
    () => ({
      setMarkdown: (markdown) => {
        latest.current = markdown;
        setCurrent(markdown);
        if (body && mode === "visual") replaceKeepingCaret(body, markdown);
      },
      getMarkdown: () => latest.current,
      focus: () => body?.editor.commands.focus(),
      insertMarkdown: (markdown) => {
        if (body && mode === "visual") body.editor.chain().focus().insertContent(parseMarkdown(markdown).content ?? []).run();
        else emit(`${latest.current.trimEnd()}

${markdown}
`);
      },
    }),
    [body, mode],
  );

  return (
    <div className={`flex flex-col ${className ?? ""}`} data-mode={mode} data-testid="page-editor">
      <PageBar
        mode={mode}
        onMode={setMode}
        editor={body?.editor ?? null}
        readOnly={readOnly}
        canRead={Boolean(readView)}
        visualUnavailable={lossy ? VISUAL_UNAVAILABLE : undefined}
        collaboration={collaboration}
        status={status}
      />
      {mode === "read" ? (
        <>
          {lossy && <Notice>{SOURCE_NOTICE}</Notice>}
          {readView}
        </>
      ) : mode === "source" ? (
        <>
          {lossy && <Notice>{SOURCE_NOTICE}</Notice>}
          {hasTableAlignment(current) && <Notice>{TABLE_ALIGNMENT_NOTICE}</Notice>}
          <Textarea
            value={current}
            onChange={(event) => emit(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && (event.key === "s" || event.key === "Enter")) {
                event.preventDefault();
                onSaveNow?.();
              }
            }}
            aria-label={`${label} (Markdown)`}
            autoFocus
            spellCheck
            className="min-h-96 resize-y rounded-none border-0 font-[family-name:var(--font-jd-kicker)] text-base shadow-none focus-visible:ring-0 md:text-sm"
          />
        </>
      ) : (
        <PageBody
          initial={current}
          label={label}
          placeholder={placeholder}
          onMarkdown={emit}
          onReady={onReady}
          blockItems={items}
          selectionActions={selectionActions}
          linkSources={linkSources}
          describeLink={describeLink}
          onOpenLink={onOpenLink}
          onSaveNow={onSaveNow}
          extensions={extensions}
          collaboration={mode === "visual" ? collaboration : undefined}
          readOnly={readOnly}
          resolveImage={resolveImage}
          onFiles={onFiles}
          frontmatterNotice={FRONTMATTER_NOTICE}
          autoFocus={autoFocus}
          contentClassName="min-h-64 py-2"
        />
      )}
    </div>
  );
}

/** A newer saved text in place of the document: the caret stays, and undo never brings the old one back. */
function replaceKeepingCaret({ editor, reset }: PageBodyApi, markdown: string): void {
  const { from, to } = editor.state.selection;
  const doc = editor.schema.nodeFromJSON(parseMarkdown(markdown));
  const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, doc.content).setMeta("addToHistory", false);
  const max = tr.doc.content.size;
  tr.setSelection(TextSelection.between(tr.doc.resolve(Math.min(from, max)), tr.doc.resolve(Math.min(to, max))));
  tr.setMeta("preventUpdate", true);
  editor.view.dispatch(tr);
  reset(markdown, editor);
}
