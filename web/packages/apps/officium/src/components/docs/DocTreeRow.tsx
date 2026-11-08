"use client";

import type { ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { menuTarget } from "@javadaba/ui/feedback";

import type { DocTreeNode } from "../../lib/backlog/types";
import type { DocTreeShared } from "./doc-tree-shared";
import { DocTreeRowContent } from "./DocTreeRowContent";
import { useFileDrop } from "./use-file-drop";

/**
 * One node of the documentation tree (JAVA-791): a `treeitem` that holds the tree's roving tab stop and
 * the APG keys; Alt+Arrow moves it among its siblings. The grip is only a pointer handle: the keyboard
 * path to reorder is Alt+Arrow, announced by the tree.
 */
export function DocTreeRow({
  node,
  level,
  shared,
  children,
}: {
  node: DocTreeNode;
  level: number;
  shared: DocTreeShared;
  children: ReactNode;
}) {
  const canDrag = shared.canWrite;
  // Dragged and dropped on the row itself, not its subtree. Nothing shifts while dragging: the planned place is a
  // placeholder in the list (JAVA-1550), and the rects dnd-kit measured at the start stay the layout to aim at.
  const { attributes, listeners, setNodeRef: setDragRef, setActivatorNodeRef, isDragging } = useDraggable({ id: node.path, disabled: !canDrag });
  const { setNodeRef: setDropRef } = useDroppable({ id: node.path, disabled: !canDrag });
  const { register } = shared;
  const hasChildren = node.children.length > 0;
  const expanded = hasChildren && !shared.collapsed.has(node.path);
  const selected = node.path === shared.current;
  // Markdown files dropped on the row become pages under it (JAVA-801); the row says so in words while they hover.
  const fileDrop = useFileDrop(shared.canWrite, (files) => shared.dropFiles(node, files));

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      shared.move(node, e.key === "ArrowUp" ? -1 : 1);
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      shared.focusRelative(node, e.key);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      shared.open(node);
    }
  }

  return (
    <div className="flex flex-col gap-0.5" role="none">
      <div
        ref={(el) => {
          register(node.path, el);
          setDragRef(el);
          setDropRef(el);
        }}
        role="treeitem"
        data-doc-path={node.path}
        aria-level={level}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={selected}
        aria-current={selected ? "page" : undefined}
        tabIndex={shared.tabStop === node.path ? 0 : -1}
        onFocus={(e) => e.target === e.currentTarget && shared.setTabStop(node.path)}
        onKeyDown={onKeyDown}
        data-dragging={isDragging || undefined}
        {...menuTarget("doc-node", node.path)}
        {...fileDrop.handlers}
        className={`group relative flex min-h-11 flex-row items-center gap-1 rounded-[var(--radius-jd-sm)] pr-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--jd-ink)]/40 ${
          fileDrop.over ? "ring-2 ring-[color:var(--jd-ink)]/60 " : ""
        }${
          selected
            ? "bg-[color:var(--jd-ink)]/[0.08] font-semibold text-[color:var(--jd-ink)]"
            : "text-[color:var(--jd-ink)]/80 hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)]"
        } ${isDragging ? "opacity-40" : ""}`}
      >
        <DocTreeRowContent node={node} expanded={expanded} sortable={canDrag} shared={shared} grip={{ setActivatorNodeRef, attributes, listeners }} />
      </div>
      {fileDrop.over && (
        <p className="px-2 text-xs font-semibold text-[color:var(--jd-ink)]" data-testid="doc-drop-hint">
          Drop to add pages here
        </p>
      )}
      {children}
    </div>
  );
}
