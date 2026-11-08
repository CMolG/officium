"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, type ReactNode } from "react";

import { markdownEditorExtensions } from "./extensions";
import { parseMarkdown } from "./markdown";
import { Notice } from "./Notice";
import { RichTextToolbar, type ToolbarControl, type ToolbarLabels } from "./toolbar";
import { useMarkdownDocument } from "./use-markdown-document";

export const isSubmitKey = (event: { key: string; metaKey: boolean; ctrlKey: boolean }) =>
  event.key === "Enter" && (event.metaKey || event.ctrlKey);

/** `MarkdownEditor`'s visual mode: the toolbar on top, the document under it. */
export function VisualEditor({
  initial,
  label,
  placeholder,
  autoFocus,
  onSubmit,
  controls,
  labels,
  contentClassName,
  toggle,
  onMarkdown,
  notice,
  frontmatterNotice,
}: {
  initial: string;
  label: string;
  placeholder?: string;
  autoFocus: boolean;
  onSubmit?: () => void;
  controls: ToolbarControl[];
  labels?: Partial<ToolbarLabels>;
  contentClassName: string;
  toggle: ReactNode;
  onMarkdown: (markdown: string) => void;
  notice?: string;
  frontmatterNotice: string;
}) {
  const source = useMarkdownDocument(initial, onMarkdown);
  // The editor is created once, and its key handler would otherwise keep the first render's
  // `onSubmit` forever.
  const submit = useRef(onSubmit);
  useEffect(() => {
    submit.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor({
    extensions: markdownEditorExtensions({ placeholder }),
    content: parseMarkdown(initial),
    // Rendered on the client only: SSR would have to guess what the editor paints.
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    onCreate: source.onCreate,
    onUpdate: source.onUpdate,
    editorProps: {
      attributes: {
        class: `jd-rich-text jd-rich-text-editor px-3 py-2 ${contentClassName}`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
      },
      handleKeyDown: (_view, event) => {
        if (submit.current && isSubmitKey(event)) {
          submit.current();
          return true;
        }
        return false;
      },
    },
  });

  return (
    <>
      {editor ? (
        <RichTextToolbar
          editor={editor}
          rows={[controls]}
          labels={labels}
          headingLevels={[1, 2, 3]}
          menuSide="bottom"
          aria-label={`${label} formatting`}
          className="border-b border-[color:var(--jd-line)] px-1 py-1"
          rowClassName="flex flex-wrap items-center gap-0.5"
          trailing={toggle}
        />
      ) : (
        // Same height as the toolbar, so the field does not jump when the editor arrives.
        <div className="h-[42px] border-b border-[color:var(--jd-line)] pointer-coarse:h-[54px]" aria-hidden="true" />
      )}
      {notice && <Notice>{notice}</Notice>}
      {source.frontmatter && <Notice>{frontmatterNotice}</Notice>}
      <EditorContent editor={editor} />
    </>
  );
}
