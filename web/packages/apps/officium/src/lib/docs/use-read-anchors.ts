"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { findQuote, type AnchorThread } from "@javadaba/rich-text";

const NAME = "jd-comment-anchor";
const BLOCK = "p, li, h1, h2, h3, h4, h5, h6, td, th, pre, blockquote, div, summary";

interface Segment {
  node: Text;
  from: number;
}

/**
 * The text a person reads in `root`, blocks separated by a newline, with where each text node starts in it. A node
 * under an element marked `data-anchor-skip` (a notice's label, a code block's language chip) is not page text.
 */
function readableText(root: HTMLElement): { text: string; segments: Segment[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.parentElement?.closest("[data-anchor-skip]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const segments: Segment[] = [];
  let text = "";
  let block: Element | null = null;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const here = node.parentElement?.closest(BLOCK) ?? null;
    if (block !== null && here !== block) text += "\n";
    block = here;
    segments.push({ node, from: text.length });
    text += node.data;
  }
  return { text, segments };
}

function rangeOf(segments: Segment[], start: number, end: number): Range | null {
  const at = (index: number, atEnd: boolean) => {
    const found = segments.findLast((s) => s.from <= index - (atEnd ? 1 : 0));
    return found ? { node: found.node, offset: index - found.from } : null;
  };
  const from = at(start, false);
  const to = at(end, true);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from.node, Math.min(from.offset, from.node.length));
  range.setEnd(to.node, Math.min(to.offset, to.node.length));
  return range;
}

interface Found {
  id: string;
  start: number;
  range: Range;
}

/** The thread whose words are under a viewport point of `root`'s document, or `null`. */
function hitIn(found: readonly Found[], root: HTMLElement | null, x: number, y: number): string | null {
  const caret = root?.ownerDocument.caretPositionFromPoint?.(x, y);
  if (!caret) return null;
  return found.find((f) => f.range.isPointInRange(caret.offsetNode, caret.offset))?.id ?? null;
}

/** The read view's passages as the popover needs them (JAVA-1538): which one is under a point, and where one is. */
export interface ReadPassages {
  /** The anchored ids in page order, or `null` before the text has been looked at. */
  anchored: string[] | null;
  /** The thread whose words are under the viewport point, or `null`. */
  hitAt: (x: number, y: number) => string | null;
  /** Where a thread's words are on screen, or `null` when they are not drawn. */
  rectOf: (id: string) => DOMRect | null;
}

/**
 * The read view's anchors (JAVA-797): where each open thread's words stand in what is on screen, drawn with the CSS
 * Custom Highlight API and clickable. Without the API the threads still list in the comments section; only the
 * drawing is missing. `contentKey` changes when the page's text does.
 */
export function useReadAnchors(
  root: RefObject<HTMLElement | null>, threads: readonly AnchorThread[], enabled: boolean, contentKey: string,
  onOpen: (id: string) => void,
): ReadPassages {
  const [anchored, setAnchored] = useState<string[] | null>(null);
  const current = useRef<Found[]>([]);

  // Read at event time only (a pointer move, the popover placing itself), never while rendering.
  const hitAt = (x: number, y: number) => hitIn(current.current, root.current, x, y);
  const rectOf = (id: string) => current.current.find((f) => f.id === id)?.range.getBoundingClientRect() ?? null;

  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return;
    const { text, segments } = readableText(element);
    const found: Found[] = threads.flatMap((thread) => {
      const place = findQuote(text, thread.quote);
      const range = place ? rangeOf(segments, place.start, place.end) : null;
      return place && range ? [{ id: thread.id, start: place.start, range }] : [];
    }).sort((a, b) => a.start - b.start);
    current.current = found;
    setAnchored(found.map((f) => f.id));
    const registry = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights : null;
    if (registry) registry.set(NAME, new Highlight(...found.map((f) => f.range)));
    const click = (event: MouseEvent) => {
      const hit = hitIn(found, element, event.clientX, event.clientY);
      if (hit) onOpen(hit);
    };
    element.addEventListener("click", click);
    return () => {
      element.removeEventListener("click", click);
      current.current = [];
      registry?.delete(NAME);
    };
  }, [root, threads, enabled, contentKey, onOpen]);

  return { anchored: enabled ? anchored : null, hitAt, rectOf };
}
