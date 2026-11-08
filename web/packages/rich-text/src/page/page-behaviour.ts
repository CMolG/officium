import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

import { headingIdAllocator } from "../headings";
import { parseMarkdownBody } from "../markdown";

/**
 * What a page needs from its editor beyond the schema (JAVA-796), in one extension:
 *
 * - **Heading ids**, from the same allocator as the read view, so the contents panel jumps to the
 *   same anchor while the page is being edited.
 * - **Pasted Markdown converts**: plain text that reads as Markdown is parsed, never inside code.
 * - **The `+` on an empty line**, in flow, with the hint: it types the `/` that opens the block
 *   menu, so the pointer and the keyboard reach one menu.
 * - **Keys**: ⌘/Ctrl+S and ⌘/Ctrl+Enter save at once, Alt+F10 moves into the selection toolbar,
 *   ⌘/Ctrl+click opens a link.
 */
export interface PageBehaviourOptions {
  onSaveNow: (() => void) | null;
  onFocusToolbar: (() => void) | null;
  onOpenLink: ((href: string) => void) | null;
  insertLabel: string;
  /** Said on an empty line: how to reach a block, and a page when links are on. */
  hint: string;
}

/** Block syntax at a line start, or inline syntax anywhere: worth parsing. A plain sentence is not. */
const MARKDOWN_HINT = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|~~~|\||<details>)|\*\*[^*\n]+\*\*|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)/;

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINT.test(text);
}

function headingIds(state: EditorState): DecorationSet {
  const idFor = headingIdAllocator();
  const decorations: Decoration[] = [];
  state.doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name !== "heading") return true;
    const text = node.textBetween(0, node.content.size, " ", " ").trim();
    decorations.push(Decoration.node(pos, pos + node.nodeSize, { id: idFor(text) }));
    return false;
  });
  return DecorationSet.create(state.doc, decorations);
}

const PLUS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';

function insertButton(view: EditorView, label: string): HTMLElement {
  const button = view.dom.ownerDocument.createElement("button");
  button.type = "button";
  button.className = "jd-insert-block";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = PLUS_ICON;
  // The caret stays on the line: the button types the `/` there.
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => {
    view.dispatch(view.state.tr.insertText("/"));
    view.focus();
  });
  return button;
}

/**
 * The empty line holding the caret gets the `+` (in the gutter) and the hint (where the caret
 * is), in one widget AFTER the caret, so the caret stays at the line's start. An empty page that
 * is not being edited shows the hint alone, like a placeholder.
 */
function emptyLine(editor: Editor, state: EditorState, options: PageBehaviourOptions): DecorationSet | null {
  const { selection, doc } = state;
  const blank = doc.childCount === 1 && doc.firstChild?.type.name === "paragraph" && doc.firstChild.content.size === 0;
  const focused = editor.isEditable && editor.isFocused;
  const { $from } = selection;
  const onEmptyLine = focused && selection.empty && $from.parent.type.name === "paragraph"
    && $from.parent.content.size === 0 && !$from.node(-1)?.type.spec.tableRole;
  if (!onEmptyLine && !blank) return null;
  const at = onEmptyLine ? $from.pos : 1;
  const widget = Decoration.widget(
    at,
    (view) => {
      const wrap = view.dom.ownerDocument.createElement("span");
      wrap.className = "jd-empty-line";
      wrap.contentEditable = "false";
      if (onEmptyLine) wrap.append(insertButton(view, options.insertLabel));
      const hint = view.dom.ownerDocument.createElement("span");
      hint.className = "jd-empty-line-hint";
      hint.setAttribute("aria-hidden", "true");
      hint.textContent = options.hint;
      wrap.append(hint);
      return wrap;
    },
    { side: 1, key: `jd-empty-${at}-${onEmptyLine}`, ignoreSelection: true, stopEvent: () => true },
  );
  return DecorationSet.create(doc, [widget]);
}

function pasteMarkdown(editor: Editor) {
  return (_view: EditorView, event: ClipboardEvent, _slice: Slice): boolean => {
    const data = event.clipboardData;
    if (!data || data.types.includes("text/html") || data.files.length) return false;
    const text = data.getData("text/plain");
    if (!text || !looksLikeMarkdown(text) || editor.isActive("codeBlock") || editor.isActive("code")) return false;
    const blocks = parseMarkdownBody(text).content ?? [];
    const only = blocks.length === 1 && blocks[0].type === "paragraph" ? blocks[0].content ?? [] : blocks;
    return editor.chain().focus().insertContent(only).run();
  };
}

export const PageBehaviour = Extension.create<PageBehaviourOptions>({
  name: "jdPageBehaviour",

  addOptions() {
    return { onSaveNow: null, onFocusToolbar: null, onOpenLink: null, insertLabel: "Insert a block", hint: "Type / for blocks" };
  },

  addKeyboardShortcuts() {
    const save = () => {
      this.options.onSaveNow?.();
      return this.options.onSaveNow !== null;
    };
    return {
      "Mod-s": save,
      "Mod-Enter": save,
      "Alt-F10": () => {
        this.options.onFocusToolbar?.();
        return this.options.onFocusToolbar !== null;
      },
    };
  },

  addProseMirrorPlugins() {
    const { editor, options } = this;
    return [
      new Plugin({ key: new PluginKey("jdHeadingIds"), props: { decorations: headingIds } }),
      new Plugin({
        key: new PluginKey("jdInsertBlock"),
        props: { decorations: (state) => emptyLine(editor, state, options) },
      }),
      new Plugin({
        key: new PluginKey("jdPagePaste"),
        props: {
          handlePaste: pasteMarkdown(editor),
          handleClick: (view, pos, event) => {
            if (!(event.metaKey || event.ctrlKey) || !options.onOpenLink) return false;
            const link = view.state.doc.resolve(pos).marks().find((mark) => mark.type.name === "link");
            if (!link?.attrs.href) return false;
            options.onOpenLink(String(link.attrs.href));
            return true;
          },
        },
      }),
    ];
  },
});
