"use client";

import { useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type DndContextProps,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import type { DocTreeNode } from "../../lib/backlog/types";
import { atOrUnder, planDrop, zoneOf, type Drop, type DropZone } from "../../lib/docs/doc-move";
import { slotOf } from "../../lib/docs/doc-drop-slot";
import { findNode } from "../../lib/docs/doc-tree";
import { useDropExpand } from "./use-drop-expand";
import type { CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

type Id = string | number;

/** The row under the pointer wins; between rows, the nearest center. */
const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : closestCenter(args);
};

interface Aimed {
  from: string;
  path: string;
  zone: DropZone;
  drop: Drop;
}

/** Where the pointer is: a drop it would make, or why it would make none (said when the drag ends). */
type Aim = Aimed | { refused: string };
const NOWHERE = "it wasn't over a place in the tree";

/**
 * What a drag on the documentation tree means (JAVA-792): the row under the pointer and which third of it
 * (the top and bottom thirds place the dragged row before or after it in its group, the middle nests it as
 * its last child), the placeholder that shows it (JAVA-1550), and what screen readers are told. A drop that is a
 * plain reorder in its own group goes to `onReorder`; any other goes to `onDropMove`.
 */
export function useDocTreeDrag({
  nodes,
  elements,
  collapsed,
  onToggle,
  onReorder,
  onDropMove,
}: {
  nodes: DocTreeNode[];
  collapsed: CollapsedNodes;
  onToggle: (path: string) => void;
  elements: MutableRefObject<Map<string, HTMLElement>>;
  onReorder: (node: DocTreeNode, position: number) => void;
  onDropMove: (node: DocTreeNode, drop: Drop) => void;
}) {
  const [hint, setHint] = useState<Aimed | null>(null);
  const [dragging, setDragging] = useState<DocTreeNode | null>(null);
  const hinted = useRef<Aimed | null>(null);
  // The last aim, kept past the drop: the announcements read it, whichever of them runs first.
  const last = useRef<Aim | null>(null);

  function aim({ active, over, delta, activatorEvent }: Pick<DragMoveEvent, "active" | "over" | "delta" | "activatorEvent">): Aim {
    const row = over ? elements.current.get(String(over.id)) : undefined;
    if (!over || !row) return { refused: NOWHERE };
    if (active.id === over.id) return { refused: "it was dropped on itself" };
    if (atOrUnder(String(over.id), String(active.id))) return { refused: "a page can't go inside itself" };
    // The row where it was measured, not where the sort animation has slid it: `over.rect` is untransformed
    // (and `over` is chosen from those rects), but it spans the row's subtree, so the height is the row's own.
    const rect = { top: over.rect.top, height: row.getBoundingClientRect().height };
    const start = activatorEvent as Partial<PointerEvent>;
    const dragged = active.rect.current.translated;
    const y = typeof start.clientY === "number" ? start.clientY + delta.y : dragged ? dragged.top + dragged.height / 2 : rect.top;
    const zone = zoneOf(y, rect);
    const drop = planDrop(nodes, String(active.id), String(over.id), zone);
    return drop ? { from: String(active.id), path: String(over.id), zone, drop } : { refused: "it is already there" };
  }

  const clear = () => {
    hinted.current = null;
    setHint(null);
    setDragging(null);
  };

  const nameOf = (id: Id) => findNode(nodes, String(id))?.name ?? "the page";

  const dndProps: Pick<DndContextProps, "collisionDetection" | "accessibility" | "onDragStart" | "onDragMove" | "onDragEnd" | "onDragCancel"> = {
    collisionDetection: collision,
    onDragStart: ({ active }: DragStartEvent) => setDragging(findNode(nodes, String(active.id))),
    onDragMove(event: DragMoveEvent) {
      const aiming = aim(event);
      const aimed = "drop" in aiming ? aiming : null;
      last.current = aiming;
      hinted.current = aimed;
      setHint((current) => (current?.path === aimed?.path && current?.zone === aimed?.zone ? current : aimed));
    },
    onDragEnd(event: DragEndEvent) {
      const now = aim(event);
      const settled = "drop" in now ? now : (hinted.current ?? now);
      const aimed = "drop" in settled ? settled : null;
      last.current = settled;
      clear();
      const node = aimed ? findNode(nodes, String(event.active.id)) : null;
      if (!aimed || !node) return;
      if (aimed.drop.to === node.path) {
        if (aimed.drop.position !== undefined) onReorder(node, aimed.drop.position);
      } else {
        onDropMove(node, aimed.drop);
      }
    },
    onDragCancel: clear,
    accessibility: {
      announcements: {
        onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
        onDragOver: ({ active, over }) => {
          if (!over) return `${nameOf(active.id)} is not over a place it can go.`;
          if (over.id === active.id) return `${nameOf(active.id)} is over its own place.`;
          if (atOrUnder(String(over.id), String(active.id))) return `${nameOf(active.id)} can't go inside itself.`;
          const aimed = last.current;
          return aimed && "drop" in aimed && aimed.path === String(over.id)
            ? `${nameOf(active.id)} would go ${aimed.zone} ${nameOf(aimed.path)}.`
            : `${nameOf(active.id)} is over ${nameOf(over.id)}.`;
        },
        onDragEnd: ({ active }) => {
          const settled = last.current;
          return settled && "drop" in settled
            ? `Dropped ${nameOf(active.id)} ${settled.zone} ${nameOf(settled.path)}.`
            : `${nameOf(active.id)} stayed where it was: ${settled?.refused ?? NOWHERE}.`;
        },
        onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled.`,
      },
    },
  };

  // Planned again only when the target row or its zone changes; the tree is not rearranged mid-drag, so the
  // same aim is always the same slot.
  const slot = useMemo(() => (hint ? slotOf(nodes, hint.from, hint.drop) : null), [hint, nodes]);
  useDropExpand(hint?.zone === "inside" ? hint.path : null, nodes, collapsed, onToggle);

  return { slot, dragging, dndProps };
}
