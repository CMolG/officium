import { Extension } from "@tiptap/core";
import type { Slice } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { dropPoint } from "@tiptap/pm/transform";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * While an image is dragged, the spot it would land on opens up: a placeholder the size of the
 * image sits there and the text reflows around it, live, the way web-os's desktop icons settle
 * during a drag (JAVA-137). Nothing is committed until the drop, which moves the image in one
 * transaction, so one undo step. Escape (the browser cancels the drag) and leaving the editor just
 * take the preview away; the document was never touched.
 *
 * The dragged image is recorded at `dragstart` from the element grabbed, never read from the
 * selection: an image dragged while already selected leaves ProseMirror without a record of the
 * node, the browser then moves the selection into the text, and ProseMirror's own drop "moved" the
 * image by deleting that empty selection -- so it landed as a COPY. The drop is ours for that
 * reason, and it lands on the same `dropPoint()` the preview measured, against the same layout
 * (placeholder included), so the preview and the commit cannot disagree.
 */
export interface ImageDragPreviewState {
  /** Position of the image being dragged. */
  from: number;
  /** Where it would land; null while the pointer is outside the editor or over its own place. */
  at: number | null;
  width: number;
  height: number;
  marginTop: string;
  marginBottom: string;
}

type Meta = { set: ImageDragPreviewState } | { clear: true };

export const imageDragPreviewKey = new PluginKey<ImageDragPreviewState | null>("imageDragPreview");

/** Whether what is being dragged is exactly one image. */
function isOneImage(slice: Slice | undefined): boolean {
  if (!slice || slice.openStart !== 0 || slice.openEnd !== 0 || slice.content.childCount !== 1) return false;
  return slice.content.firstChild?.type.name === "image";
}

/** The position of the image whose DOM holds `target`, or null when the target is not an image. */
function imageAt(view: EditorView, target: EventTarget | null): number | null {
  if (!(target instanceof Node)) return null;
  let found: number | null = null;
  view.state.doc.descendants((node, pos) => {
    if (found != null) return false;
    if (node.type.name !== "image") return true;
    const dom = view.nodeDOM(pos);
    if (dom && (dom === target || dom.contains(target))) found = pos;
    return false;
  });
  return found;
}

/** Where the image would land, or null when that is where it already is. */
export function landingSpot(state: EditorState, from: number, mousePos: number): number | null {
  const node = state.doc.nodeAt(from);
  if (!node) return null;
  const at = dropPoint(state.doc, mousePos, state.doc.slice(from, from + node.nodeSize)) ?? mousePos;
  return at === from || at === from + node.nodeSize ? null : at;
}

function placeholder(view: EditorView, preview: ImageDragPreviewState): HTMLElement {
  const doc = view.dom.ownerDocument;
  const el = doc.createElement("div");
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.dataset.testid = "image-drop-placeholder";
  el.className = "jd-image-drop-placeholder";
  Object.assign(el.style, {
    boxSizing: "border-box",
    width: `${preview.width}px`,
    maxWidth: "100%",
    height: `${preview.height}px`,
    marginTop: preview.marginTop,
    marginBottom: preview.marginBottom,
    border: "2px dashed var(--jd-accent, currentColor)",
    borderRadius: "0.5rem",
    background: "color-mix(in oklab, var(--jd-accent, currentColor) 8%, transparent)",
  });
  const reduced = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Transform and opacity only (native-portability rule 9); the reflow itself is not animated.
  if (!reduced && typeof el.animate === "function") {
    el.animate([{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }], {
      duration: 140,
      easing: "ease-out",
    });
  }
  return el;
}

function measure(view: EditorView, from: number): Omit<ImageDragPreviewState, "from" | "at"> {
  const dom = view.nodeDOM(from);
  if (!(dom instanceof HTMLElement)) return { width: 0, height: 0, marginTop: "0", marginBottom: "0" };
  const style = view.dom.ownerDocument.defaultView?.getComputedStyle(dom);
  return {
    width: dom.offsetWidth,
    height: dom.offsetHeight,
    marginTop: style?.marginTop ?? "0",
    marginBottom: style?.marginBottom ?? "0",
  };
}

function update(view: EditorView, meta: Meta) {
  view.dispatch(view.state.tr.setMeta(imageDragPreviewKey, meta));
}

/**
 * The move itself: the image leaves `from` and lands at `at`, selected, in one transaction (one
 * undo step). Marked as the drop, which also ends the preview.
 */
export function moveImage(state: EditorState, from: number, at: number): Transaction | null {
  const node = state.doc.nodeAt(from);
  if (node?.type.name !== "image") return null;
  const tr = state.tr.delete(from, from + node.nodeSize);
  const pos = tr.mapping.map(at);
  tr.insert(pos, node);
  return tr.setSelection(NodeSelection.create(tr.doc, pos)).setMeta("uiEvent", "drop").scrollIntoView();
}

export function applyImageDragPreview(tr: Transaction, value: ImageDragPreviewState | null): ImageDragPreviewState | null {
  const meta = tr.getMeta(imageDragPreviewKey) as Meta | undefined;
  if (meta && "clear" in meta) return null;
  if (meta && "set" in meta) return meta.set;
  // The drop IS the commit: the preview goes in the same transaction the image moves in.
  if (tr.getMeta("uiEvent") === "drop") return null;
  if (!value || !tr.docChanged) return value;
  const from = tr.mapping.mapResult(value.from);
  if (from.deleted) return null;
  return { ...value, from: from.pos, at: value.at == null ? null : tr.mapping.map(value.at) };
}

export const ImageDragPreview = Extension.create({
  name: "imageDragPreview",

  addProseMirrorPlugins() {
    return [
      new Plugin<ImageDragPreviewState | null>({
        key: imageDragPreviewKey,
        state: {
          init: () => null,
          apply: applyImageDragPreview,
        },
        props: {
          decorations(state) {
            const preview = imageDragPreviewKey.getState(state);
            if (!preview || preview.at == null) return null;
            const node = state.doc.nodeAt(preview.from);
            if (!node) return null;
            return DecorationSet.create(state.doc, [
              Decoration.node(preview.from, preview.from + node.nodeSize, {
                class: "jd-image-drag-source",
                style: "opacity: 0.35",
              }),
              Decoration.widget(preview.at, (view) => placeholder(view, preview), {
                side: -1,
                ignoreSelection: true,
                key: `image-drop-${preview.width}x${preview.height}`,
              }),
            ]);
          },
          handleDrop(view, event, slice, moved) {
            const current = imageDragPreviewKey.getState(view.state);
            // A copy (a modifier held) or a drag from elsewhere stays ProseMirror's own.
            if (!current || !moved || !isOneImage(slice)) return false;
            const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const at = hit ? landingSpot(view.state, current.from, hit.pos) : null;
            const tr = at == null ? null : moveImage(view.state, current.from, at);
            // Dropped on its own place: nothing moves, and nothing may be copied either.
            view.dispatch(tr ?? view.state.tr.setMeta(imageDragPreviewKey, { clear: true }));
            view.focus();
            return true;
          },
          handleDOMEvents: {
            dragstart(view, event) {
              const from = imageAt(view, event.target);
              if (from == null) return false;
              update(view, { set: { ...measure(view, from), from, at: null } });
              return false;
            },
            dragover(view, event) {
              const current = imageDragPreviewKey.getState(view.state);
              if (!current || !isOneImage(view.dragging?.slice)) return false;
              const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
              const at = hit ? landingSpot(view.state, current.from, hit.pos) : null;
              if (current.at !== at) update(view, { set: { ...current, at } });
              return false;
            },
            dragleave(view, event) {
              const current = imageDragPreviewKey.getState(view.state);
              const into = event.relatedTarget;
              if (!current || current.at == null || (into instanceof Node && view.dom.contains(into))) return false;
              update(view, { set: { ...current, at: null } });
              return false;
            },
            dragend(view) {
              if (imageDragPreviewKey.getState(view.state)) update(view, { clear: true });
              return false;
            },
          },
        },
      }),
    ];
  },
});
