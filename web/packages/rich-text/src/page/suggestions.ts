import { Extension, type Editor, type Range } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";

/**
 * The three things a person types to open a menu in a page (JAVA-796): `/` on an empty line for a
 * block, `[[` for a page, `@` for a member (then pages). TipTap's suggestion plugin finds the
 * trigger and the query; what is listed and what choosing does is the menu's, drawn by React. The
 * two meet in a `SuggestionStore`, so the plugins never hold a React state.
 */
export type SuggestionKind = "block" | "page" | "mention";

export interface OpenSuggestion {
  kind: SuggestionKind;
  query: string;
  /** The trigger and the query in the document: replaced by whatever is chosen. */
  range: Range;
  /** Where the trigger is on screen, for the menu's anchor. */
  rect: () => DOMRect | null;
}

export class SuggestionStore {
  private current: OpenSuggestion | null = null;
  private readonly listeners = new Set<() => void>();
  /** The drawn menu's keys (arrows, Enter); `true` when it used one. */
  keyHandler: ((event: KeyboardEvent) => boolean) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  get = () => this.current;

  set(next: OpenSuggestion | null) {
    this.current = next;
    for (const listener of this.listeners) listener();
  }
}

/** Never inside code: a `/` or an `@` there is text the person is writing. */
function inCode(state: EditorState, at: number): boolean {
  const $at = state.doc.resolve(at);
  return $at.parent.type.spec.code === true || state.schema.marks.code?.isInSet($at.marks()) !== undefined;
}

/** `/` opens the block menu only on a line that holds nothing but what is being typed. */
function onEmptyLine(state: EditorState, range: Range): boolean {
  const $from = state.doc.resolve(range.from);
  const typed = state.doc.textBetween(range.from, Math.min(range.to, $from.end()));
  return $from.parent.type.name === "paragraph" && $from.parent.textContent === typed;
}

function trigger(editor: Editor, store: SuggestionStore, kind: SuggestionKind, options: {
  char: string;
  allowSpaces: boolean;
  allowedPrefixes: string[] | null;
  startOfLine: boolean;
  allow: (state: EditorState, range: Range) => boolean;
}) {
  const open = (props: { query: string; range: Range; clientRect?: (() => DOMRect | null) | null }) =>
    store.set({ kind, query: props.query, range: props.range, rect: () => props.clientRect?.() ?? null });
  return Suggestion({
    editor,
    pluginKey: new PluginKey(`jd-suggest-${kind}`),
    char: options.char,
    allowSpaces: options.allowSpaces,
    allowedPrefixes: options.allowedPrefixes,
    startOfLine: options.startOfLine,
    decorationClass: "jd-suggestion",
    allow: ({ state, range }) => !inCode(state, range.from) && options.allow(state, range),
    render: () => ({
      onStart: open,
      onUpdate: open,
      onExit: () => {
        if (store.get()?.kind === kind) store.set(null);
      },
      onKeyDown: ({ event }) => {
        if (event.key === "Escape") return true;
        return store.keyHandler?.(event) ?? false;
      },
    }),
  });
}

export const PageSuggestions = Extension.create<{ store: SuggestionStore | null; links: boolean; mentions: boolean }>({
  name: "jdPageSuggestions",

  addOptions() {
    return { store: null, links: true, mentions: true };
  },

  addProseMirrorPlugins() {
    const { store, links, mentions } = this.options;
    if (!store) return [];
    return [
      trigger(this.editor, store, "block", {
        char: "/",
        allowSpaces: false,
        allowedPrefixes: null,
        startOfLine: true,
        allow: onEmptyLine,
      }),
      ...(links
        ? [
            trigger(this.editor, store, "page", {
              char: "[[",
              allowSpaces: true,
              allowedPrefixes: null,
              startOfLine: false,
              allow: () => true,
            }),
          ]
        : []),
      ...(links && mentions
        ? [
            trigger(this.editor, store, "mention", {
              char: "@",
              allowSpaces: false,
              allowedPrefixes: [" ", "("],
              startOfLine: false,
              allow: () => true,
            }),
          ]
        : []),
    ];
  },
});
