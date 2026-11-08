"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, type JSONContent } from "@tiptap/core";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

import { inlineExtensions, serializeInlineHtml, type SerializeOptions } from "./inline-html";
import { sameDocument } from "./markdown";
import { InlineToolbar } from "./InlineToolbar";

export interface InlineHtmlChange {
  /** The field's HTML. Byte for byte the original while the person has changed nothing. */
  html: string;
  changed: boolean;
}

export interface InlineHtmlEditorHandle {
  /** Puts a variable (`{name}`) at the caret as one chip. */
  insertToken: (expr: string) => void;
}

export interface InlineHtmlEditorProps {
  /** The HTML the field opens with, with variables already as `<span data-token="{x}">` chips. Read once. */
  value: string;
  onChange: (change: InlineHtmlChange) => void;
  label: string;
  /** Buttons and other one-line fields: no line breaks, no bold, italic or links. */
  singleLine?: boolean;
  escapeText?: SerializeOptions["escapeText"];
  /** What `onChange` hands back while nothing has changed, when it is not `value` (chips differ from source). */
  original?: string;
  onFocusChange?: (focused: boolean) => void;
  ref?: Ref<InlineHtmlEditorHandle>;
  "data-testid"?: string;
}

/** Enter is a line break, or nothing in a single-line field. */
const keys = (singleLine: boolean) =>
  Extension.create({
    name: "inlineKeys",
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => (singleLine ? true : editor.commands.setHardBreak()),
        "Shift-Enter": ({ editor }) => (singleLine ? true : editor.commands.setHardBreak()),
        "Mod-b": ({ editor }) => (singleLine ? true : editor.commands.toggleMark("bold")),
        "Mod-i": ({ editor }) => (singleLine ? true : editor.commands.toggleMark("italic")),
      };
    },
  });

/**
 * One line or paragraph of an email: text, line breaks, chips for variables, bold, italic and
 * links. Like `MarkdownEditor`, it hands back the ORIGINAL string while nothing has changed, so a
 * region someone only looked at is never rewritten.
 */
export function InlineHtmlEditor({
  value,
  onChange,
  label,
  singleLine = false,
  escapeText,
  original,
  onFocusChange,
  ref,
  "data-testid": testId,
}: InlineHtmlEditorProps) {
  const baseline = useRef<JSONContent | null>(null);
  const first = useRef(original ?? value);
  const options = useRef({ escapeText, onChange, onFocusChange });
  useEffect(() => {
    options.current = { escapeText, onChange, onFocusChange };
  }, [escapeText, onChange, onFocusChange]);

  const editor = useEditor({
    extensions: [...inlineExtensions(), keys(singleLine)],
    content: `<p>${value}</p>`,
    parseOptions: { preserveWhitespace: "full" },
    immediatelyRender: false,
    onCreate: ({ editor: created }) => {
      baseline.current = created.getJSON();
    },
    onUpdate: ({ editor: updated }) => {
      const json = updated.getJSON();
      const unchanged = baseline.current !== null && sameDocument(json, baseline.current);
      const html = unchanged ? first.current : serializeInlineHtml(json, { escapeText: options.current.escapeText });
      options.current.onChange({ html, changed: !unchanged });
    },
    onFocus: () => options.current.onFocusChange?.(true),
    onBlur: () => options.current.onFocusChange?.(false),
    editorProps: {
      attributes: {
        class: "jd-rich-text jd-rich-text-editor px-3 py-2 min-h-10",
        role: "textbox",
        "aria-multiline": String(!singleLine),
        "aria-label": label,
      },
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      insertToken: (expr) => {
        editor?.chain().focus().insertContent({ type: "token", attrs: { expr } }).run();
      },
    }),
    [editor],
  );

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--jd-focus)]"
      data-testid={testId}
    >
      {editor && !singleLine && <InlineToolbar editor={editor} label={label} />}
      <EditorContent editor={editor} />
    </div>
  );
}
