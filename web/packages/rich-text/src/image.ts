import { mergeAttributes } from "@tiptap/core";
import ImageExt from "@tiptap/extension-image";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView, NodeView } from "@tiptap/pm/view";

/**
 * A book's image (JAVA-139): click it and four corner handles resize it, like Word. Dragging keeps
 * the aspect ratio; holding Shift frees it. The width is stored as a PERCENTAGE of the text column,
 * so a resized image keeps its place when the page size changes and when the book is exported.
 * The same node carries how text wraps it and where it sits (JAVA-138, `imageLayout`).
 *
 * TipTap's own `resize` option was not used: it stores pixels, Shift locks the ratio instead of
 * freeing it, and a touch drag never commits (it listens for `mouseup` only).
 */

/** The narrowest an image can be made, as a percentage of the text column. */
export const IMAGE_MIN_WIDTH = 10;
/** The widest: the text column (the page width minus its margins). */
export const IMAGE_MAX_WIDTH = 100;

export function clampImageWidth(percent: number): number {
  const clamped = Math.min(IMAGE_MAX_WIDTH, Math.max(IMAGE_MIN_WIDTH, percent));
  return Math.round(clamped * 10) / 10;
}

/** `width: N%; aspect-ratio: R` for whatever renders the node outside the editor (HTML, EPUB). */
export function imageSizeStyle(width: unknown, aspectRatio: unknown): string | null {
  const parts: string[] = [];
  if (typeof width === "number") parts.push(`width: ${width}%`);
  if (typeof aspectRatio === "number") parts.push(`aspect-ratio: ${aspectRatio}`, "object-fit: fill");
  return parts.length > 0 ? parts.join("; ") : null;
}

/**
 * How text flows around a book's image (JAVA-138), the Word options a printed page and an EPUB
 * can both honor. `topBottom` keeps the image on its own lines; `square` floats it to one side
 * and the paragraphs after it wrap around.
 *
 * Deliberately missing: "in line with text" (the image is a block node, and turning it inline
 * would invalidate every saved book: an inline node cannot sit directly in the document), and
 * "behind/in front of text" (EPUB readers don't honor positioned images). Square has no center:
 * CSS cannot flow text down both sides of an image, so it would be an option the page silently drops.
 */
export type ImageWrap = "topBottom" | "square";
export type ImageAlign = "left" | "center" | "right";

export interface ImageLayout {
  wrap: ImageWrap;
  align: ImageAlign;
}

/** A layout as stored, whatever was asked for: unknown values fall back, square is never centered. */
export function imageLayout(wrap: unknown, align: unknown): ImageLayout {
  const w: ImageWrap = wrap === "square" ? "square" : "topBottom";
  const a: ImageAlign = align === "center" || align === "right" ? align : "left";
  return { wrap: w, align: w === "square" && a === "center" ? "left" : a };
}

/**
 * The CSS that places the image, as longhand declarations: pagination writes `margin-top` on the
 * same element, so a `margin` shorthand here would wipe its page gaps. Nothing for the default
 * (top and bottom, left), which is how every image looked before JAVA-138.
 */
export function imagePlacement(wrap: unknown, align: unknown): [property: string, value: string][] {
  const layout = imageLayout(wrap, align);
  if (layout.wrap === "square") {
    const away = layout.align === "left" ? "margin-right" : "margin-left";
    return [["float", layout.align], [away, "1em"], ["margin-bottom", "0.5em"]];
  }
  if (layout.align === "center") return [["margin-left", "auto"], ["margin-right", "auto"]];
  if (layout.align === "right") return [["margin-left", "auto"], ["margin-right", "0"]];
  return [];
}

/** Size and placement together, for an `<img>` rendered outside the editor (HTML, EPUB). */
export function imageStyle(attrs: Record<string, unknown> | undefined): string | null {
  const placement = imagePlacement(attrs?.wrap, attrs?.align);
  const parts = [
    imageSizeStyle(attrs?.width, attrs?.aspectRatio),
    // An `<img>` is inline: auto margins and a float only place it once it is a block.
    ...(placement.length > 0 ? ["display: block", ...placement.map(([property, value]) => `${property}: ${value}`)] : []),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookImage: {
      /** Sets how text wraps the SELECTED image and where it sits (JAVA-138). */
      setImageLayout: (layout: Partial<ImageLayout>) => ReturnType;
    };
  }
}

function numberAttribute(value: string | null): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type Corner = "nw" | "ne" | "sw" | "se";

const CORNERS: Record<Corner, string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
};

/** The height a freed image cannot be squashed below, in pixels. */
const MIN_HEIGHT_PX = 16;

interface Resize {
  corner: Corner;
  pointerId: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  column: number;
  width: number;
  aspectRatio: number | null;
}

/** The width images are measured against: the content box of the block the image sits in. */
function columnWidth(frame: HTMLElement): number {
  const parent = frame.parentElement;
  if (!parent) return frame.offsetWidth;
  const style = parent.ownerDocument.defaultView?.getComputedStyle(parent);
  const padding = (parseFloat(style?.paddingLeft ?? "0") || 0) + (parseFloat(style?.paddingRight ?? "0") || 0);
  return Math.max(1, parent.clientWidth - padding);
}

function imageView(initial: PMNode, view: EditorView, getPos: () => number | undefined): NodeView {
  let node = initial;
  let resize: Resize | null = null;
  const doc = view.dom.ownerDocument;

  const frame = doc.createElement("div");
  frame.dataset.imageFrame = "";
  // `outline` draws the selection without changing the box pagination and the drag preview measure.
  frame.className =
    "group relative block max-w-full outline-offset-2 data-selected:outline-2 data-selected:outline-[color:var(--jd-accent)]";

  // The picture stays natively draggable: its drag is the one ProseMirror turns into a move (and
  // JAVA-137's drop preview follows). The handles stop their own events, so they never start one.
  const img = doc.createElement("img");
  img.className = "block h-auto max-w-full";
  frame.appendChild(img);

  const handles = (Object.keys(CORNERS) as Corner[]).map((corner) => {
    const handle = doc.createElement("span");
    handle.dataset.resizeHandle = corner;
    handle.setAttribute("aria-hidden", "true");
    // 16 px under a mouse, 44 px under a finger (layout floor L3); the dot inside is what shows.
    handle.className = `absolute z-10 hidden size-4 touch-none flex-row items-center justify-center pointer-coarse:size-11 group-data-selected:flex ${CORNERS[corner]}`;
    const dot = doc.createElement("span");
    dot.className = "size-3 rounded-full border-2 border-[color:var(--jd-accent)] bg-[color:var(--jd-raised)]";
    handle.appendChild(dot);
    handle.addEventListener("pointerdown", (event) => start(event, corner, handle));
    frame.appendChild(handle);
    return handle;
  });

  function render(width: number | null, aspectRatio: number | null) {
    frame.style.width = width == null ? "fit-content" : `${width}%`;
    img.style.width = width == null ? "" : "100%";
    img.style.aspectRatio = aspectRatio == null ? "" : String(aspectRatio);
    img.style.objectFit = aspectRatio == null ? "" : "fill";
    frame.dataset.width = width == null ? "" : String(width);
  }

  function place() {
    for (const property of ["float", "margin-left", "margin-right", "margin-bottom"]) frame.style.removeProperty(property);
    for (const [property, value] of imagePlacement(node.attrs.wrap, node.attrs.align)) frame.style.setProperty(property, value);
    const { wrap, align } = imageLayout(node.attrs.wrap, node.attrs.align);
    frame.dataset.wrap = wrap;
    frame.dataset.align = align;
  }

  function sync() {
    const { src, alt, title, width, aspectRatio } = node.attrs;
    if (img.getAttribute("src") !== src) img.src = src ?? "";
    if (alt) img.alt = alt;
    else img.removeAttribute("alt");
    if (title) img.title = title;
    else img.removeAttribute("title");
    render(width, aspectRatio);
    place();
  }

  function start(event: PointerEvent, corner: Corner, handle: HTMLElement) {
    if (!view.editable || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const box = img.getBoundingClientRect();
    const column = columnWidth(frame);
    resize = {
      corner,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: box.width,
      startHeight: box.height,
      column,
      width: node.attrs.width ?? clampImageWidth((box.width / column) * 100),
      aspectRatio: node.attrs.aspectRatio,
    };
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", cancel);
  }

  function move(event: PointerEvent) {
    if (!resize || event.pointerId !== resize.pointerId) return;
    const { corner, column, startWidth, startHeight } = resize;
    const grow = (delta: number, towardsStart: boolean) => (towardsStart ? -delta : delta);
    const minPx = (column * IMAGE_MIN_WIDTH) / 100;
    const widthPx = Math.min(column, Math.max(minPx, startWidth + grow(event.clientX - resize.startX, corner.endsWith("w"))));
    resize.width = clampImageWidth((widthPx / column) * 100);
    if (event.shiftKey) {
      const heightPx = Math.max(MIN_HEIGHT_PX, startHeight + grow(event.clientY - resize.startY, corner.startsWith("n")));
      resize.aspectRatio = Math.round((widthPx / heightPx) * 1000) / 1000;
    } else {
      resize.aspectRatio = node.attrs.aspectRatio;
    }
    render(resize.width, resize.aspectRatio);
  }

  function stop(handle: EventTarget | null) {
    if (handle instanceof HTMLElement) {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", cancel);
    }
    resize = null;
  }

  function finish(event: PointerEvent) {
    const done = resize;
    stop(event.currentTarget);
    const pos = getPos();
    if (!done || pos == null) return sync();
    if (done.width === node.attrs.width && done.aspectRatio === node.attrs.aspectRatio) return;
    // One transaction, so one undo step; the image stays selected with its handles.
    const tr = view.state.tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      width: done.width,
      aspectRatio: done.aspectRatio,
    });
    view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)));
  }

  function cancel(event: PointerEvent) {
    stop(event.currentTarget);
    sync();
  }

  sync();

  return {
    dom: frame,
    update(next) {
      if (next.type !== node.type) return false;
      node = next;
      if (!resize) sync();
      return true;
    },
    selectNode() {
      frame.dataset.selected = "";
    },
    deselectNode() {
      delete frame.dataset.selected;
    },
    // A press on a handle is a resize, never a ProseMirror drag or a new selection. A right click
    // belongs to the app's context menu (JAVA-138): ProseMirror would select the image on its
    // mouseup, focusing the editor and closing the menu that `contextmenu` had just opened.
    stopEvent: (event) =>
      (event.target instanceof Element && event.target.closest("[data-resize-handle]") != null) ||
      (event instanceof MouseEvent && event.button === 2 && (event.type === "mousedown" || event.type === "mouseup")),
    ignoreMutation: () => true,
    destroy() {
      for (const handle of handles) stop(handle);
    },
  };
}

export const BookImage = ImageExt.extend({
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element) => {
          const stored = numberAttribute(element.getAttribute("data-width"));
          const styled = /^\s*(\d+(?:\.\d+)?)%\s*$/.exec(element.style.width)?.[1];
          const width = stored ?? (styled ? Number(styled) : null);
          return width == null ? null : clampImageWidth(width);
        },
        renderHTML: () => ({}),
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => numberAttribute(element.getAttribute("data-aspect-ratio")),
        renderHTML: () => ({}),
      },
      // Both read together, so a pasted `data-wrap="square" data-align="center"` is normalised.
      wrap: {
        default: "topBottom",
        parseHTML: (element) => imageLayout(element.getAttribute("data-wrap"), element.getAttribute("data-align")).wrap,
        renderHTML: () => ({}),
      },
      align: {
        default: "left",
        parseHTML: (element) => imageLayout(element.getAttribute("data-wrap"), element.getAttribute("data-align")).align,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { width, aspectRatio } = node.attrs;
    const { wrap, align } = imageLayout(node.attrs.wrap, node.attrs.align);
    const style = imageStyle(node.attrs);
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        ...(width != null ? { "data-width": String(width) } : {}),
        ...(aspectRatio != null ? { "data-aspect-ratio": String(aspectRatio) } : {}),
        ...(wrap !== "topBottom" ? { "data-wrap": wrap } : {}),
        ...(align !== "left" ? { "data-align": align } : {}),
        ...(style ? { style } : {}),
      }),
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),
      // On the selected image, one transaction (one undo step); the image stays selected.
      setImageLayout:
        (layout: Partial<ImageLayout>) =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;
          if (!(selection instanceof NodeSelection) || selection.node.type.name !== this.name) return false;
          const current = selection.node.attrs;
          const next = imageLayout(layout.wrap ?? current.wrap, layout.align ?? current.align);
          if (dispatch) {
            tr.setNodeMarkup(selection.from, undefined, { ...current, ...next });
            tr.setSelection(NodeSelection.create(tr.doc, selection.from));
          }
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, view, getPos }) => imageView(node, view, getPos);
  },
});
