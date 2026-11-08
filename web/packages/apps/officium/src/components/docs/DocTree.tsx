"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DndContext } from "@dnd-kit/core";
import { FeedbackMenuScope, type MenuProviders } from "@javadaba/ui/feedback";

import { useBoardSensors } from "../../lib/backlog/dnd-sensors";
import type { DocTreeNode } from "../../lib/backlog/types";
import { findNode, siblingsOf } from "../../lib/docs/doc-tree";
import type { Drop } from "../../lib/docs/doc-move";
import { nodeActions, type DocNodeActions } from "./doc-node-actions";
import type { DocTreeShared } from "./doc-tree-shared";
import { DocDragOverlay } from "./DocDragOverlay";
import { DocTreeGroup } from "./DocTreeGroup";
import { useDocTreeDrag } from "./use-doc-tree-drag";
import type { CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

const parentPath = (path: string) => path.slice(0, Math.max(path.lastIndexOf("/"), 0));

/** The nodes a person can see, in order: a collapsed node hides its children. */
function visiblePaths(nodes: DocTreeNode[], collapsed: CollapsedNodes): string[] {
  return nodes.flatMap((node) => [node.path, ...(collapsed.has(node.path) ? [] : visiblePaths(node.children, collapsed))]);
}

/**
 * The documentation tree (JAVA-791): `role=tree`, collapsible, ordered by hand or A to Z, with the APG keys.
 * Pointer: drag a row by its grip. Keyboard: Alt+ArrowUp/ArrowDown moves the focused row among its siblings,
 * and the move is announced. A failed move is reverted by the caller, which says why in `notice`.
 */
export function DocTree({
  nodes,
  projectId,
  current,
  canWrite,
  collapsed,
  notice,
  actions,
  onToggle,
  onOpen,
  onNavigate,
  onReorder,
  onDropMove,
  onDropFiles,
}: {
  nodes: DocTreeNode[];
  projectId: string;
  current: string | null;
  canWrite: boolean;
  collapsed: CollapsedNodes;
  /** A move's result or a refusal, spoken to screen readers and shown under the tree. */
  notice: string | null;
  actions: DocNodeActions;
  onToggle: (path: string) => void;
  onOpen: (node: DocTreeNode) => void;
  onNavigate: () => void;
  onReorder: (node: DocTreeNode, position: number) => void;
  /** A drop that re-nests the node or places it in another group (JAVA-792). */
  onDropMove: (node: DocTreeNode, drop: Drop) => void;
  onDropFiles: (node: DocTreeNode, files: File[]) => void;
}) {
  const sensors = useBoardSensors();
  const elements = useRef(new Map<string, HTMLElement>());
  const visible = useMemo(() => visiblePaths(nodes, collapsed), [nodes, collapsed]);
  const [focused, setFocused] = useState<string | null>(null);
  // The drag overlay is portaled to the page body, found from the tree itself so no global is read.
  const [body, setBody] = useState<HTMLElement | null>(null);
  const treeRef = useCallback((el: HTMLElement | null) => setBody(el?.ownerDocument.body ?? null), []);
  const { slot, dragging, dndProps } = useDocTreeDrag({ nodes, elements, collapsed, onToggle, onReorder, onDropMove });
  const tabStop = visible.includes(focused ?? "") ? focused : visible.includes(current ?? "") ? current : (visible[0] ?? null);

  const focusPath = useCallback((path: string | undefined) => path && elements.current.get(path)?.focus(), []);
  const register = useCallback((path: string, element: HTMLElement | null) => {
    if (element) elements.current.set(path, element);
    else elements.current.delete(path);
  }, []);

  const focusRelative = useCallback(
    (node: DocTreeNode, key: string) => {
      const at = visible.indexOf(node.path);
      const expanded = node.children.length > 0 && !collapsed.has(node.path);
      if (key === "ArrowDown") focusPath(visible[Math.min(at + 1, visible.length - 1)]);
      else if (key === "ArrowUp") focusPath(visible[Math.max(at - 1, 0)]);
      else if (key === "Home") focusPath(visible[0]);
      else if (key === "End") focusPath(visible[visible.length - 1]);
      else if (key === "ArrowRight") {
        if (node.children.length === 0) return;
        if (!expanded) onToggle(node.path);
        else focusPath(node.children[0].path);
      } else if (key === "ArrowLeft") {
        if (expanded) onToggle(node.path);
        else if (node.depth > 1) focusPath(parentPath(node.path));
      }
    },
    [visible, collapsed, focusPath, onToggle],
  );

  const move = useCallback(
    (node: DocTreeNode, delta: -1 | 1) => {
      if (!canWrite) return;
      const group = siblingsOf(nodes, node.path);
      const at = group.findIndex((n) => n.path === node.path);
      const to = at + delta;
      if (to < 0 || to >= group.length) return;
      onReorder(node, to);
      requestAnimationFrame(() => focusPath(node.path));
    },
    [canWrite, nodes, onReorder, focusPath],
  );

  const shared = useMemo<DocTreeShared>(
    () => ({
      projectId, current, canWrite, collapsed, tabStop, toggle: onToggle, open: onOpen, onNavigate, actions, move,
      focusRelative, register, setTabStop: setFocused, slot, dragging: dragging?.path ?? null, dropFiles: onDropFiles,
    }),
    [projectId, current, canWrite, collapsed, tabStop, onToggle, onOpen, onNavigate, actions, move, focusRelative, register, slot, dragging, onDropFiles],
  );

  const menu = useMemo<MenuProviders>(
    () => ({
      "doc-node": ({ targetId }) => {
        const node = targetId ? findNode(nodes, targetId) : null;
        return node
          ? nodeActions(node, canWrite, actions).map((a) => ({
              id: a.id,
              label: a.label,
              onSelect: () => {
                a.run();
                onNavigate();
              },
              tone: a.danger ? ("danger" as const) : undefined,
            }))
          : [];
      },
    }),
    [nodes, canWrite, actions, onNavigate],
  );

  return (
    <FeedbackMenuScope providers={menu} label="Documentation">
      <DndContext sensors={sensors} {...dndProps}>
        <div ref={treeRef} role="tree" aria-label="Documentation pages" className="flex flex-col gap-0.5">
          <DocTreeGroup nodes={nodes} parent="" level={1} shared={shared} />
        </div>
        {dragging && body && createPortal(<DocDragOverlay node={dragging} />, body)}
      </DndContext>
      <p role="status" aria-live="polite" className={notice ? "px-2 pt-1 text-xs text-[color:var(--jd-muted)]" : "sr-only"}>
        {notice}
      </p>
    </FeedbackMenuScope>
  );
}
