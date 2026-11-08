import { Extension } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

import { canQuote, findQuote, quoteOf, type CommentQuote } from "./comment-quote";

/** A thread the editor should mark: its id and the words it is about. */
export interface AnchorThread {
  id: string;
  quote: CommentQuote;
}

/** Where the open threads stand now, in page order, and the ones whose words are gone. */
export interface AnchorReport {
  anchored: string[];
  detached: string[];
}

export interface CommentAnchorsOptions {
  /** A click on a marked passage. */
  onOpen?: (id: string) => void;
  /** Called after any change in which threads are anchored. */
  onReport?: (report: AnchorReport) => void;
}

interface Located {
  id: string;
  quote: CommentQuote;
  from: number;
  to: number;
}

interface AnchorState {
  threads: AnchorThread[];
  located: Located[];
  detached: string[];
  pending: { from: number; to: number } | null;
  decorations: DecorationSet;
}

interface Meta {
  threads?: AnchorThread[];
  pending?: { from: number; to: number } | null;
}

const KEY = new PluginKey<AnchorState>("jdCommentAnchors");

/** The document's text with the ProseMirror position of every character; blocks are separated by a newline. */
export function textIndex(doc: PmNode): { text: string; positions: number[] } {
  let text = "";
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        text += node.text[i];
        positions.push(pos + i);
      }
    } else if (node.isBlock && text.length > 0 && !text.endsWith("\n")) {
      text += "\n";
      positions.push(-1);
    }
    return true;
  });
  return { text, positions };
}

function locate(doc: PmNode, threads: AnchorThread[]): { located: Located[]; detached: string[] } {
  const { text, positions } = textIndex(doc);
  const located: Located[] = [];
  const detached: string[] = [];
  for (const thread of threads) {
    const range = findQuote(text, thread.quote);
    if (!range) {
      detached.push(thread.id);
      continue;
    }
    located.push({ ...thread, from: positions[range.start], to: positions[range.end - 1] + 1 });
  }
  located.sort((a, b) => a.from - b.from);
  return { located, detached };
}

/** After an edit: a mapped range that still holds its words stays; one that lost them is searched for again. */
function remap(tr: Transaction, previous: AnchorState): { located: Located[]; detached: string[] } {
  const keep: Located[] = [];
  const lost: AnchorThread[] = [...previous.detached.map((id) => previous.threads.find((t) => t.id === id)!)];
  for (const item of previous.located) {
    const from = tr.mapping.map(item.from, 1);
    const to = tr.mapping.map(item.to, -1);
    const holds = from < to && findQuote(tr.doc.textBetween(from, to, "\n", "\n"), item.quote) !== null;
    if (holds) keep.push({ ...item, from, to });
    else lost.push({ id: item.id, quote: item.quote });
  }
  if (lost.length === 0) return { located: keep, detached: [] };
  const searched = locate(tr.doc, lost);
  return { located: [...keep, ...searched.located].sort((a, b) => a.from - b.from), detached: searched.detached };
}

function draw(doc: PmNode, located: Located[], pending: AnchorState["pending"]): DecorationSet {
  const marks = located.map((item) =>
    Decoration.inline(item.from, item.to, { class: "jd-comment-anchor", "data-comment-thread": item.id }),
  );
  if (pending && pending.from < pending.to) marks.push(Decoration.inline(pending.from, pending.to, { class: "jd-comment-pending" }));
  return DecorationSet.create(doc, marks);
}

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * The controller a host keeps next to the extension: it hands the open threads to the editor and tells it which
 * selection is waiting for a comment. Threads travel by transaction meta, never by props, so the editor is not
 * rebuilt when they change.
 */
export interface CommentAnchors {
  extension: Extension;
  setThreads: (threads: AnchorThread[]) => void;
  /** Keeps the selection drawn while its comment is being written; `null` clears it. */
  setPending: (range: { from: number; to: number } | null) => void;
  /** The quote the editor's current selection makes, or `null` when it holds no words. */
  quoteOfSelection: () => { quote: CommentQuote; from: number; to: number } | null;
}

export function createCommentAnchors(options: CommentAnchorsOptions = {}): CommentAnchors {
  let current: EditorView | null = null;
  /** What was sent before the editor existed, newest wins: only the latest threads and selection matter. */
  let queued: Meta | null = null;
  let reported: AnchorReport = { anchored: [], detached: [] };

  const send = (meta: Meta) => {
    if (!current) {
      queued = { ...queued, ...meta };
      return;
    }
    // Marks are decorations: this is never an edit. `preventUpdate` keeps the editor from calling it one when a
    // normalising plugin appends a change to the first transaction it sees (the host would save the page rewritten).
    current.dispatch(current.state.tr.setMeta(KEY, meta).setMeta("addToHistory", false).setMeta("preventUpdate", true));
  };

  const report = (state: AnchorState) => {
    const next = { anchored: state.located.map((l) => l.id), detached: state.detached };
    if (same(next.anchored, reported.anchored) && same(next.detached, reported.detached)) return;
    reported = next;
    options.onReport?.(next);
  };

  const plugin = new Plugin<AnchorState>({
    key: KEY,
    state: {
      init: (_config, state: EditorState) => ({ threads: [], located: [], detached: [], pending: null, decorations: DecorationSet.create(state.doc, []) }),
      apply: (tr, previous) => {
        const meta = tr.getMeta(KEY) as Meta | undefined;
        if (!meta && !tr.docChanged) return previous;
        const threads = meta?.threads ?? previous.threads;
        const pending = meta && "pending" in meta ? (meta.pending ?? null) : mapPending(tr, previous.pending);
        const found = meta?.threads ? locate(tr.doc, threads) : tr.docChanged ? remap(tr, previous) : previous;
        return { threads, pending, located: found.located, detached: found.detached, decorations: draw(tr.doc, found.located, pending) };
      },
    },
    props: {
      decorations: (state) => KEY.getState(state)?.decorations ?? null,
      handleClick: (view, pos) => {
        const hit = KEY.getState(view.state)?.located.find((l) => pos >= l.from && pos <= l.to);
        if (!hit || !options.onOpen) return false;
        options.onOpen(hit.id);
        return false;
      },
    },
    view: (view) => {
      current = view;
      const waiting = queued;
      queued = null;
      queueMicrotask(() => {
        if (current === view && waiting) send(waiting);
      });
      return {
        update: (updated) => {
          const state = KEY.getState(updated.state);
          if (state) report(state);
        },
        destroy: () => {
          current = null;
        },
      };
    },
  });

  const extension = Extension.create({
    name: "jdCommentAnchors",
    addProseMirrorPlugins: () => [plugin],
  });

  return {
    extension,
    setThreads: (threads) => send({ threads }),
    setPending: (range) => send({ pending: range }),
    quoteOfSelection: () => {
      if (!current) return null;
      const { from, to, empty } = current.state.selection;
      if (empty) return null;
      const { text, positions } = textIndex(current.state.doc);
      const start = positions.findIndex((p) => p >= from);
      let end = positions.length;
      // A block break (-1) is no position: walk past it, or the quote runs to the last block (JAVA-1538).
      while (end > 0 && (positions[end - 1] === -1 || positions[end - 1] >= to)) end--;
      if (start < 0 || end <= start) return null;
      const quote = quoteOf(text, { start, end });
      return canQuote(quote.exact) ? { quote, from, to } : null;
    },
  };
}

function mapPending(tr: Transaction, pending: AnchorState["pending"]): AnchorState["pending"] {
  return pending ? { from: tr.mapping.map(pending.from, 1), to: tr.mapping.map(pending.to, -1) } : null;
}
