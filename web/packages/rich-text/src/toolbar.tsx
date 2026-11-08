"use client";

import type { ChainedCommands } from "@tiptap/core";
import { useEditorState, type Editor } from "@tiptap/react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, ChevronDown, Code, Heading1, Heading2,
  Heading3, Heading4, Heading5, Heading6, Highlighter, Image as ImageIcon, Italic, Link as LinkIcon, List,
  ListChecks, ListOrdered, Minus, Pilcrow, Quote, Redo2, RemoveFormatting, SeparatorHorizontal, SquareCode, Strikethrough,
  Subscript, Superscript, Underline as UnderlineIcon, Undo2, X, type LucideIcon,
} from "lucide-react";

import {
  Button, cn, FontPicker, Input, Popover, PopoverContent, PopoverTrigger, Separator, Toggle, type FontOption,
} from "@javadaba/ui";

import { previewFormat, restoreFormat } from "./preview";
import { runBlockCommand } from "./selection";
import { ACTION_INK, BlockTypeMenu, blockTypeCommand, type HeadingLevel } from "./toolbar-block-menu";
import { DEFAULT_TOOLBAR_LABELS, type ToolbarLabels } from "./toolbar-labels";

export { DEFAULT_TOOLBAR_LABELS, type ToolbarLabels } from "./toolbar-labels";

/**
 * The formatting controls, extracted from Fabula's editor dock so every app that edits text
 * draws the same buttons, with the same states and the same keyboard behaviour. An app picks
 * WHICH controls and in what rows; what each control does lives here once.
 *
 * How a control LOOKS lives in `@javadaba/ui` (JAVA-143): a pressed state is a `Toggle`, an action
 * a `Button`, the font a `FontPicker`. The toolbar itself stays in this package because it reads
 * the editor through tiptap, and the design system does not depend on tiptap.
 */

/** The toolbar's control size: 32 px, and the 44 px touch floor on a coarse pointer (L3). */
const CONTROL = "size-8 min-w-8 shrink-0 px-0 pointer-coarse:size-11";

export type ToolbarControl =
  | "blockType"
  | "fontFamily"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "superscript"
  | "subscript"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "justify"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  /** A forced page break; shown only when the editor's schema has a `pageBreak` node (Fabula adds one). */
  | "pageBreak"
  | "highlight"
  | "clearFormatting"
  | "link"
  | "image"
  | "undo"
  | "redo"
  | "|";

const SHORTCUTS: Partial<Record<ToolbarControl, string>> = {
  bold: "⌘B",
  italic: "⌘I",
  underline: "⌘U",
  undo: "⌘Z",
  redo: "⌘⇧Z",
};

/**
 * Controls a TITLE keeps (Fabula's chapter title is one paragraph with inline marks). Every
 * other control is greyed out with the reason when the app passes `blockToolsUnavailable`.
 */
const TITLE_SAFE = new Set<ToolbarControl>([
  "fontFamily", "bold", "italic", "underline", "strike", "code", "superscript", "subscript", "undo", "redo",
]);

/**
 * One control: a `Toggle` when it has a pressed state (`active` given), a `Button` when it is an
 * action (undo, insert a divider...), so `aria-pressed` is only announced where it means something.
 */
export function ToolbarButton({
  active,
  onClick,
  title,
  icon: Icon,
  disabled,
  unavailable,
  className,
  theaterTarget,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  icon: LucideIcon;
  disabled?: boolean;
  /**
   * Greyed out WITH its reason (rules/psicologia §2: disabled always says why). `aria-disabled`
   * instead of `disabled`, because a disabled button swallows the hover that shows the reason.
   */
  unavailable?: string;
  className?: string;
  /** Where a Theater cursor may point (`doc://projects/ui/theater-miniapp-contract` §4). */
  theaterTarget?: string;
}) {
  const shared = {
    type: "button" as const,
    "data-theater-target": theaterTarget,
    // Keep the caret where the author left it: a toolbar button has no use for the focus, and
    // taking it moves the selection ProseMirror was holding.
    onMouseDown: (event: MouseEvent) => event.preventDefault(),
    title: unavailable ?? title,
    // A control that rests says why in its name ("Bulleted list, not in a title"), not only in a tooltip.
    "aria-label": unavailable ? `${title}, ${unavailable.charAt(0).toLowerCase()}${unavailable.slice(1)}` : title,
    "aria-disabled": unavailable ? true : undefined,
    disabled,
    className: cn(CONTROL, className),
  };
  const icon = <Icon size={15} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />;

  if (active === undefined) {
    return (
      <Button
        {...shared}
        variant="ghost"
        register="ui"
        size="icon"
        className={cn(CONTROL, ACTION_INK, className)}
        onClick={unavailable ? undefined : onClick}
      >
        {icon}
      </Button>
    );
  }
  return (
    <Toggle {...shared} size="sm" pressed={active && !unavailable} onPressedChange={unavailable ? undefined : onClick}>
      {icon}
    </Toggle>
  );
}

export function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-0.5 h-6 bg-[color:var(--jd-ink)]/[0.08]" />;
}

export interface RichTextToolbarProps {
  editor: Editor;
  /** The controls, row by row; `"|"` draws a divider. */
  rows: ToolbarControl[][];
  labels?: Partial<ToolbarLabels>;
  /** The headings the block menu offers, after "Paragraph". */
  headingLevels?: HeadingLevel[];
  /** The `fontFamily` control's options (value = CSS font stack; grouped by its generic family). */
  fonts?: FontOption[];
  onImageInsert?: () => void;
  /** Set when the caret is somewhere only inline marks exist (a title): the reason every other
   *  control shows while greyed out. */
  blockToolsUnavailable?: string;
  /**
   * A line under the rows that says where the resting tools live, while `blockToolsUnavailable` is on
   * (Lib-RichText 12, Title mode): "Lists, quotes and images live in the body, not the title. Press
   * Enter to start writing."
   */
  blockToolsHelp?: string;
  theaterTargets?: Partial<Record<ToolbarControl, string>>;
  /** Where the block menu opens: above a dock at the foot of the screen, below a toolbar on top. */
  menuSide?: "top" | "bottom";
  className?: string;
  rowClassName?: string;
  /** Appended after the last row's controls (e.g. the Markdown source toggle). */
  trailing?: ReactNode;
  "aria-label"?: string;
}

export function RichTextToolbar({
  editor,
  rows,
  labels: labelOverrides,
  headingLevels = [1, 2, 3, 4],
  fonts = [],
  onImageInsert,
  blockToolsUnavailable,
  blockToolsHelp,
  theaterTargets = {},
  menuSide = "bottom",
  className,
  rowClassName = "flex items-center gap-0.5",
  trailing,
  "aria-label": ariaLabel,
}: RichTextToolbarProps) {
  const labels = { ...DEFAULT_TOOLBAR_LABELS, ...labelOverrides };
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  /*
   * While an option is previewed on the selection (JAVA-140) the editor reports the PREVIEWED
   * format; the controls keep showing the committed one, so the font trigger doesn't jump to
   * whatever the pointer is over. Frozen when a preview starts, released when it ends.
   */
  const [committed, setCommitted] = useState<{ fontFamily: string; level: number } | null>(null);

  // A toolbar that goes away mid-preview (the dock follows the active editor) takes it back.
  useEffect(() => () => restoreFormat(editor), [editor]);

  /*
   * The toolbar's state is read through `useEditorState`, not by calling `editor.isActive()`
   * during render. React Compiler memoises what a render derives from its inputs, and the
   * `editor` object is the same reference after every keystroke, so `isActive` results of the
   * first render were reused while the caret moved on (Fabula, 2026-09-22: "the toolbar is not in
   * sync with the insertion point"). A selector returning plain values is compared by value.
   */
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      return {
        level: ([1, 2, 3, 4, 5, 6] as const).find((level) => e.isActive("heading", { level })) ?? 0,
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        code: e.isActive("code"),
        superscript: e.isActive("superscript"),
        subscript: e.isActive("subscript"),
        alignLeft: e.isActive({ textAlign: "left" }),
        alignCenter: e.isActive({ textAlign: "center" }),
        alignRight: e.isActive({ textAlign: "right" }),
        justify: e.isActive({ textAlign: "justify" }),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        taskList: e.isActive("taskList"),
        blockquote: e.isActive("blockquote"),
        codeBlock: e.isActive("codeBlock"),
        highlight: e.isActive("highlight"),
        link: e.isActive("link"),
        fontFamily: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  const preview = (apply: (chain: ChainedCommands) => ChainedCommands) => {
    setCommitted((frozen) => frozen ?? { fontFamily: state.fontFamily, level: state.level });
    previewFormat(editor, apply);
  };
  const endPreview = () => {
    restoreFormat(editor);
    setCommitted(null);
  };
  const shown = committed ?? state;

  const unavailableFor = (control: ToolbarControl) =>
    blockToolsUnavailable && !TITLE_SAFE.has(control) ? blockToolsUnavailable : undefined;
  const nameOf = (control: Exclude<ToolbarControl, "|" | "blockType" | "fontFamily">) => {
    const label = labels[control];
    const shortcut = SHORTCUTS[control];
    return shortcut ? `${label} (${shortcut})` : label;
  };

  const addLink = () => {
    if (linkUrl) editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const button = (
    control: Exclude<ToolbarControl, "|" | "blockType" | "fontFamily" | "link">,
    icon: LucideIcon,
    run: () => void,
    active?: boolean,
    disabled?: boolean,
  ) => (
    <ToolbarButton
      key={control}
      active={active}
      onClick={run}
      title={nameOf(control)}
      icon={icon}
      disabled={disabled}
      unavailable={unavailableFor(control)}
      theaterTarget={theaterTargets[control]}
    />
  );

  const render = (control: ToolbarControl, index: number): ReactNode => {
    const chain = () => editor.chain().focus();
    switch (control) {
      case "|":
        return <ToolbarDivider key={`divider-${index}`} />;
      case "blockType":
        return (
          <BlockTypeMenu
            key={control}
            editor={editor}
            level={shown.level}
            levels={headingLevels}
            labels={labels}
            unavailable={unavailableFor(control)}
            side={menuSide}
            onPreview={(value) => preview((c) => blockTypeCommand(c, value))}
            onPreviewEnd={endPreview}
          />
        );
      case "fontFamily":
        return (
          <FontPicker
            key={control}
            value={shown.fontFamily}
            fonts={fonts}
            onPreview={(value) =>
              value === null
                ? endPreview()
                : preview((c) => (value ? c.setFontFamily(value) : c.unsetFontFamily()))}
            onValueChange={(value) => {
              endPreview();
              if (value) chain().setFontFamily(value).run();
              else chain().unsetFontFamily().run();
            }}
            unavailable={unavailableFor(control)}
            label={labels.font}
            defaultLabel={labels.fontDefault}
            searchLabel={labels.fontSearch}
            emptyLabel={labels.fontEmpty}
            side={menuSide}
            // Choosing a font puts the caret back in the text (`chain().focus()`); the trigger
            // must not take it back afterwards.
            restoreFocus={false}
            className="text-xs"
            data-testid="font-picker"
          />
        );
      case "bold":
        return button(control, Bold, () => chain().toggleBold().run(), state.bold);
      case "italic":
        return button(control, Italic, () => chain().toggleItalic().run(), state.italic);
      case "underline":
        return button(control, UnderlineIcon, () => chain().toggleUnderline().run(), state.underline);
      case "strike":
        return button(control, Strikethrough, () => chain().toggleStrike().run(), state.strike);
      case "code":
        return button(control, Code, () => chain().toggleCode().run(), state.code);
      case "superscript":
        return button(control, Superscript, () => chain().toggleSuperscript().run(), state.superscript);
      case "subscript":
        return button(control, Subscript, () => chain().toggleSubscript().run(), state.subscript);
      case "alignLeft":
        return button(control, AlignLeft, () => runBlockCommand(editor, (c) => c.setTextAlign("left")), state.alignLeft);
      case "alignCenter":
        return button(control, AlignCenter, () => runBlockCommand(editor, (c) => c.setTextAlign("center")), state.alignCenter);
      case "alignRight":
        return button(control, AlignRight, () => runBlockCommand(editor, (c) => c.setTextAlign("right")), state.alignRight);
      case "justify":
        return button(control, AlignJustify, () => runBlockCommand(editor, (c) => c.setTextAlign("justify")), state.justify);
      case "bulletList":
        return button(control, List, () => runBlockCommand(editor, (c) => c.toggleBulletList()), state.bulletList);
      case "orderedList":
        return button(control, ListOrdered, () => runBlockCommand(editor, (c) => c.toggleOrderedList()), state.orderedList);
      case "taskList":
        return button(control, ListChecks, () => runBlockCommand(editor, (c) => c.toggleTaskList()), state.taskList);
      case "blockquote":
        return button(control, Quote, () => runBlockCommand(editor, (c) => c.toggleBlockquote()), state.blockquote);
      case "codeBlock":
        return button(control, SquareCode, () => runBlockCommand(editor, (c) => c.toggleCodeBlock()), state.codeBlock);
      case "horizontalRule":
        return button(control, Minus, () => runBlockCommand(editor, (c) => c.setHorizontalRule()));
      case "pageBreak":
        // Only an editor whose schema has the node offers it: every other app's toolbar is unchanged.
        return editor.schema.nodes.pageBreak ? button(control, SeparatorHorizontal, () => runBlockCommand(editor, (c) => c.insertContent({ type: "pageBreak" }))) : null;
      case "highlight":
        return button(control, Highlighter, () => chain().toggleHighlight().run(), state.highlight);
      case "clearFormatting":
        return button(control, RemoveFormatting, () => runBlockCommand(editor, (c) => c.clearNodes().unsetAllMarks()));
      case "image":
        return onImageInsert ? button(control, ImageIcon, onImageInsert) : null;
      case "undo":
        return button(control, Undo2, () => chain().undo().run(), undefined, !state.canUndo);
      case "redo":
        return button(control, Redo2, () => chain().redo().run(), undefined, !state.canRedo);
      case "link":
        if (showLinkInput && !unavailableFor(control)) {
          return (
            <div key={control} className="flex flex-row items-center gap-0.5">
              <Input
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLink();
                  }
                  if (event.key === "Escape") {
                    // The link box closes; the dialog or page around the editor does not.
                    event.stopPropagation();
                    setShowLinkInput(false);
                  }
                }}
                placeholder="https://..."
                aria-label={labels.link}
                className="h-8 w-40 px-2 md:text-xs"
                autoFocus
              />
              <ToolbarButton onClick={addLink} title={labels.linkApply} icon={Check} />
              <ToolbarButton onClick={() => setShowLinkInput(false)} title={labels.linkCancel} icon={X} />
            </div>
          );
        }
        return (
          <ToolbarButton
            key={control}
            active={state.link}
            unavailable={unavailableFor(control)}
            onClick={() => {
              if (state.link) editor.chain().focus().extendMarkRange("link").unsetLink().run();
              else setShowLinkInput(true);
            }}
            title={labels.link}
            icon={LinkIcon}
            theaterTarget={theaterTargets.link}
          />
        );
    }
  };

  return (
    <div className={className} role="toolbar" aria-label={ariaLabel}>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={rowClassName}>
          {row.map(render)}
          {rowIndex === rows.length - 1 && trailing}
        </div>
      ))}
      {blockToolsUnavailable && blockToolsHelp && (
        <p className="px-1 pt-1 text-xs text-[color:var(--jd-muted)]">{blockToolsHelp}</p>
      )}
    </div>
  );
}
