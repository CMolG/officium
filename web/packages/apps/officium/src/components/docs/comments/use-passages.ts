"use client";

import { useCallback, type RefObject } from "react";

import type { DocPage } from "../../../lib/backlog/types";
import { useReadAnchors } from "../../../lib/docs/use-read-anchors";
import type { Commenting } from "./use-commenting";

/** The commented passages of the text, read or edited, as the comments popover needs them (JAVA-1538). */
export interface Passages {
  /** Thread ids found in the text, in page order; `null` until it has looked. */
  anchored: string[] | null;
  /** The thread whose words are under the pointer, or `null`. */
  hitAt: (event: PointerEvent) => string | null;
  /** Where a thread's words start on screen, or the selection being commented on (`null`). */
  rectOf: (id: string | null) => DOMRect | null;
}

/**
 * Marks the open threads' words over the page (JAVA-797) and finds them under the pointer (JAVA-1538). The read view
 * draws them with the CSS Custom Highlight API (`useReadAnchors`); the live editor draws its own decorations, spans
 * carrying `data-comment-thread`, and the selection waiting for a comment as `.jd-comment-pending`.
 */
export function usePassages(body: RefObject<HTMLElement | null>, commenting: Commenting | undefined, page: DocPage, editing: boolean): Passages {
  const openThread = commenting?.openThread;
  const open = useCallback((id: string) => openThread?.(id), [openThread]);
  const read = useReadAnchors(body, commenting?.anchorThreads ?? [], Boolean(commenting) && !editing, `${page.version}:${page.body.length}`, open);
  const { hitAt: readHitAt, rectOf: readRectOf } = read;

  const hitAt = useCallback(
    (event: PointerEvent) => {
      if (!editing) return readHitAt(event.clientX, event.clientY);
      const mark = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-comment-thread]") : null;
      return mark?.dataset.commentThread ?? null;
    },
    [editing, readHitAt],
  );
  const rectOf = useCallback(
    (id: string | null) => {
      if (id !== null && !editing) return readRectOf(id);
      const selector = id === null ? ".jd-comment-pending" : `[data-comment-thread="${id}"]`;
      return body.current?.querySelector(selector)?.getBoundingClientRect() ?? null;
    },
    [body, editing, readRectOf],
  );

  return { anchored: editing ? (commenting?.editorAnchored ?? null) : read.anchored, hitAt, rectOf };
}
