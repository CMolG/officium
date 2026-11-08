"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Code, ExternalLink, Italic, Keyboard, Link as LinkIcon, Pencil, Strikethrough, Unlink } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Popover, PopoverAnchor, PopoverContent, Text } from "@javadaba/ui";

import { ToolbarButton, ToolbarDivider } from "../toolbar";
import { LinkEditor } from "./LinkEditor";
import { TurnIntoMenu } from "./TurnIntoMenu";
import type { BlockItem } from "./block-items";

export interface SelectionAction {
  id: string;
  /** Rendered after the formatting controls, with the editor to act on (JAVA-797's Comment). */
  render: (editor: Editor) => ReactNode;
}

export interface SelectionBubbleProps {
  editor: Editor;
  /** The Turn-into menu's choices. */
  turnInto: readonly BlockItem[];
  actions?: readonly SelectionAction[];
  /** A link's target in words: a page's title for `doc://`. Falls back to the address. */
  describeLink?: (href: string) => string;
  /** Opens a link (also on Ctrl/⌘+click). Without it, only web links open, in a new tab. */
  onOpenLink?: (href: string) => void;
  /** Hidden while a suggestion menu is open: one floating thing at a time. */
  suppressed: boolean;
  /** Bumped by Alt+F10: moves focus into the toolbar. */
  focusRequest: number;
}

const WEB_LINK = /^https?:\/\//i;

/**
 * The floating toolbar of a page (JAVA-796). Over selected text: bold, italic, strikethrough,
 * inline code, kbd, link, Turn into, then the host's actions -- only what the page schema allows
 * (strikethrough stays because the docs editor has always offered it; the lint keeps warning).
 * With the caret in a link: where it goes, Open, Edit and Remove.
 *
 * Alt+F10 moves into it, Escape goes back to the text. Above the selection, below it on touch so
 * the system's own menu keeps its place. In a portal, anchored to the selection (layout floor L1).
 */
export function SelectionBubble({ editor, turnInto, actions = [], describeLink, onOpenLink, suppressed, focusRequest }: SelectionBubbleProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { empty, from, to } = e.state.selection;
      return {
        focused: e.isFocused,
        empty,
        from,
        to,
        text: !empty && e.state.doc.textBetween(from, to, " ").trim().length > 0,
        link: e.isActive("link") ? String(e.getAttributes("link").href ?? "") : null,
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        kbd: e.isActive("kbd"),
        inCodeBlock: e.isActive("codeBlock"),
      };
    },
  });
  const [inside, setInside] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [touch, setTouch] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null);
  const anchor = useRef({ getBoundingClientRect: () => selectionRect(editor) });

  useEffect(() => {
    const dom = editor.view.dom;
    const onPointer = (event: PointerEvent) => setTouch(event.pointerType === "touch");
    dom.addEventListener("pointerdown", onPointer);
    return () => dom.removeEventListener("pointerdown", onPointer);
  }, [editor]);

  useEffect(() => {
    if (focusRequest) toolbar.current?.querySelector<HTMLElement>("button")?.focus();
  }, [focusRequest]);

  const mode = state.link !== null && state.empty ? "link" : state.text && !state.inCodeBlock ? "format" : null;
  const open = !suppressed && mode !== null && (state.focused || inside || editingLink);
  const back = () => {
    setEditingLink(false);
    editor.commands.focus();
  };

  return (
    <Popover open={open}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        side={touch ? "bottom" : "top"}
        align="center"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={back}
        onFocusCapture={() => setInside(true)}
        onBlurCapture={(event) => setInside(event.currentTarget.contains(event.relatedTarget as Node | null))}
        className="w-auto"
      >
        <div ref={toolbar} role="toolbar" aria-label="Formatting" className="flex flex-row flex-wrap items-center gap-0.5 p-1">
          {editingLink ? (
            <LinkEditor editor={editor} initial={state.link ?? ""} onDone={back} />
          ) : mode === "link" && state.link !== null ? (
            <>
              <Text className="max-w-56 truncate px-2 text-sm text-[color:var(--jd-muted)]" title={state.link}>
                {describeLink?.(state.link) ?? state.link}
              </Text>
              {onOpenLink ? (
                <ToolbarButton title="Open link" icon={ExternalLink} onClick={() => onOpenLink(state.link ?? "")} />
              ) : WEB_LINK.test(state.link) ? (
                <a href={state.link} target="_blank" rel="noopener noreferrer nofollow" aria-label="Open link" className="inline-flex size-8 flex-row items-center justify-center pointer-coarse:size-11">
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              ) : null}
              <ToolbarButton title="Edit link" icon={Pencil} onClick={() => setEditingLink(true)} />
              <ToolbarButton title="Remove link" icon={Unlink} onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} />
            </>
          ) : (
            <>
              <ToolbarButton title="Bold (Ctrl+B)" icon={Bold} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
              <ToolbarButton title="Italic (Ctrl+I)" icon={Italic} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
              <ToolbarButton title="Strikethrough" icon={Strikethrough} active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
              <ToolbarButton title="Inline code" icon={Code} active={state.code} onClick={() => editor.chain().focus().toggleCode().run()} />
              <ToolbarButton title="Key" icon={Keyboard} active={state.kbd} onClick={() => editor.chain().focus().toggleMark("kbd").run()} />
              <ToolbarButton title="Link" icon={LinkIcon} active={state.link !== null} onClick={() => setEditingLink(true)} />
              <ToolbarDivider />
              <TurnIntoMenu editor={editor} items={turnInto} />
              {actions.map((action) => (
                <span key={action.id} className="contents">
                  {action.render(editor)}
                </span>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The selection's box on screen, read when the popover asks: it follows scrolling. */
function selectionRect(editor: Editor): DOMRect {
  const { from, to } = editor.state.selection;
  try {
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);
    return new DOMRect(left, start.top, Math.max(right - left, 1), end.bottom - start.top);
  } catch {
    return new DOMRect();
  }
}
