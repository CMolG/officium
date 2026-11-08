"use client";

import type { Extensions } from "@tiptap/core";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { markdownExtensions } from "../extensions";
import type { ResolveImage } from "../markdown-image";
import { parseMarkdown } from "../markdown";
import { useMarkdownDocument } from "../use-markdown-document";
import { Notice } from "../Notice";
import type { BlockItem } from "./block-items";
import { PageCodeBlock } from "./CodeBlockView";
import { collaborationExtensions, type PageCollaboration } from "./collaboration";
import type { LinkSources } from "./links";
import { PageBehaviour } from "./page-behaviour";
import { PageMenu } from "./PageMenu";
import { SelectionBubble, type SelectionAction } from "./SelectionBubble";
import { PageSuggestions, SuggestionStore } from "./suggestions";

/** What the frame around the body reaches: the editor, and how to load a newer saved text. */
export interface PageBodyApi {
  editor: Editor;
  reset: (markdown: string, editor: Editor) => void;
}

export interface PageBodyProps {
  initial: string;
  label: string;
  placeholder?: string;
  onMarkdown: (markdown: string) => void;
  onReady: (api: PageBodyApi | null) => void;
  blockItems: readonly BlockItem[];
  selectionActions?: readonly SelectionAction[];
  linkSources?: LinkSources;
  describeLink?: (href: string) => string;
  onOpenLink?: (href: string) => void;
  onSaveNow?: () => void;
  /** The host's own nodes and marks (JAVA-803's collaboration). */
  extensions?: Extensions;
  /** A live room (JAVA-803): the editor starts empty and the room's document is its content. */
  collaboration?: PageCollaboration;
  /** A person who follows the room but cannot change it: no menus, and the document is not editable. */
  readOnly?: boolean;
  /** The URL an image's source is drawn from, for the sources the host owns (JAVA-798); `null` draws a placeholder. */
  resolveImage?: ResolveImage;
  /** Files pasted or dropped onto the body (JAVA-798). The host uploads them; without it the editor's defaults stand. */
  onFiles?: (files: File[]) => void;
  frontmatterNotice: string;
  contentClassName?: string;
  autoFocus?: boolean;
}

/** A paste or drop that carries files goes to the host to upload; text and moved blocks stay the editor's. */
function takeFiles(list: FileList | undefined, event: Event, onFiles: ((files: File[]) => void) | undefined): boolean {
  if (!onFiles || !list || list.length === 0) return false;
  event.preventDefault();
  onFiles(Array.from(list));
  return true;
}

/** The page's visual editor (JAVA-796): the document, its menus and its floating toolbar. */
export function PageBody({
  initial, label, placeholder, onMarkdown, onReady, blockItems, selectionActions, linkSources, describeLink,
  onOpenLink, onSaveNow, extensions = [], collaboration, readOnly = false, resolveImage, onFiles, frontmatterNotice, contentClassName = "", autoFocus = false,
}: PageBodyProps) {
  const source = useMarkdownDocument(initial, onMarkdown);
  const hint = placeholder ?? (linkSources ? "Type / for blocks, [[ to link a page" : "Type / for blocks");
  const [store] = useState(() => new SuggestionStore());
  const [toolbarFocus, setToolbarFocus] = useState(0);
  // The editor is built once; its keys and clicks read the latest callbacks through this.
  const latest = useRef({ onSaveNow, onOpenLink, onFiles });
  useEffect(() => {
    latest.current = { onSaveNow, onOpenLink, onFiles };
  });

  const editor = useEditor({
    extensions: [
      ...markdownExtensions({ codeBlock: false, resolveImage, undoRedo: !collaboration }),
      PageCodeBlock,
      PageSuggestions.configure({ store, links: Boolean(linkSources), mentions: Boolean(linkSources?.members) }),
      PageBehaviour.configure({
        onSaveNow: () => latest.current.onSaveNow?.(),
        onFocusToolbar: () => setToolbarFocus((n) => n + 1),
        onOpenLink: (href) => latest.current.onOpenLink?.(href),
        insertLabel: "Insert a block",
        hint,
      }),
      ...(collaboration ? collaborationExtensions(collaboration) : []),
      ...extensions,
    ],
    content: collaboration ? undefined : parseMarkdown(initial),
    immediatelyRender: false,
    editable: !readOnly,
    autofocus: autoFocus ? "end" : false,
    onCreate: source.onCreate,
    onUpdate: source.onUpdate,
    editorProps: {
      handlePaste: (_view, event) => takeFiles(event.clipboardData?.files, event, latest.current.onFiles),
      handleDrop: (_view, event, _slice, moved) =>
        !moved && takeFiles(event.dataTransfer?.files, event, latest.current.onFiles),
      attributes: {
        class: `jd-rich-text jd-rich-text-editor jd-page-editor ${contentClassName}`,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "aria-placeholder": hint,
      },
    },
  });

  useEffect(() => {
    onReady(editor ? { editor, reset: source.reset } : null);
    return () => onReady(null);
    // `source.reset` only touches refs and a state setter: the editor is what changes.
  }, [editor, onReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useSyncExternalStore(store.subscribe, store.get, () => null);

  return (
    <>
      {source.frontmatter && <Notice>{frontmatterNotice}</Notice>}
      <EditorContent editor={editor} />
      {editor && !readOnly && open && (
        <PageMenu editor={editor} store={store} open={open} blockItems={blockItems} linkSources={linkSources} />
      )}
      {editor && !readOnly && (
        <SelectionBubble
          editor={editor}
          turnInto={blockItems.filter((item) => item.turnInto)}
          actions={selectionActions}
          describeLink={describeLink}
          onOpenLink={onOpenLink}
          suppressed={open !== null}
          focusRequest={toolbarFocus}
        />
      )}
    </>
  );
}
