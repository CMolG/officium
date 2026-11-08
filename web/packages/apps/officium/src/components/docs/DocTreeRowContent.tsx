"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Link } from "@javadaba/ui/navigation";
import { ChevronRight, GripVertical, Plus } from "lucide-react";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocTreeNode } from "../../lib/backlog/types";
import { nodeActions } from "./doc-node-actions";
import type { DocTreeShared } from "./doc-tree-shared";
import { DocNodeIcon } from "./DocNodeIcon";
import { DocNodeMenu } from "./DocNodeMenu";
import { DraftBadge } from "./DraftBadge";

/**
 * What sits inside a documentation row (JAVA-791): the grip, the chevron, the icon and name (a link when
 * the node has a page), and the `+` and `…` buttons. The row around it owns the tab stop and the keys,
 * so none of these is a tab stop of its own except the two buttons that act on the node.
 */
export function DocTreeRowContent({
  node,
  expanded,
  sortable,
  shared,
  grip,
}: {
  node: DocTreeNode;
  expanded: boolean;
  /** Whether the grip is drawn: the person can write, so the row can be dragged. */
  sortable: boolean;
  shared: DocTreeShared;
  grip: {
    setActivatorNodeRef: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
}) {
  const hasChildren = node.children.length > 0;
  const label = (
    <>
      <DocNodeIcon icon={node.icon} color={node.iconColor} isSection={!node.page || hasChildren || node.depth === 1} />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      {node.page && !node.page.published && (
        // Only its creator ever sees an unpublished draft (JAVA-793), so the row says so in words, the same word as the
        // page's header (JAVA-1552).
        <DraftBadge />
      )}
      {hasChildren && node.sortMode === "alphabetical" && (
        <span className="shrink-0 text-xs text-[color:var(--jd-muted)]">A–Z</span>
      )}
    </>
  );
  return (
    <>
      {sortable ? (
        <span
          ref={grip.setActivatorNodeRef}
          {...grip.attributes}
          {...grip.listeners}
          tabIndex={-1}
          role="presentation"
          aria-hidden="true"
          title="Drag to move or reorder"
          className="flex size-6 shrink-0 cursor-grab flex-row items-center justify-center text-[color:var(--jd-faint)] opacity-0 group-hover:opacity-100"
        >
          <GripVertical size={12} />
        </span>
      ) : (
        <span className="size-6 shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        tabIndex={-1}
        aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
        onClick={() => shared.toggle(node.path)}
        className={`flex size-6 shrink-0 flex-row items-center justify-center ${hasChildren ? "" : "invisible"}`}
      >
        <ChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>
      {node.page ? (
        <Link
          href={docsPath(shared.projectId, node.path)}
          aria-current={node.path === shared.current ? "page" : undefined}
          onClick={shared.onNavigate}
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-row items-center gap-2 py-1.5"
        >
          {label}
        </Link>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => shared.toggle(node.path)}
          className="flex min-w-0 flex-1 flex-row items-center gap-2 py-1.5 text-left"
        >
          {label}
        </button>
      )}
      {/*
        The buttons stay tab stops, but take no room until the row is hovered or focused (JAVA-1560): a
        name must not truncate to a letter because two icons sit in its flow. `sr-only` keeps them out of
        the layout; `not-sr-only` brings them back in place. Touch devices always show them.
      */}
      <div className="flex flex-row items-center gap-1 sr-only group-hover:not-sr-only group-focus-visible:not-sr-only group-has-[:focus-visible]:not-sr-only has-[[aria-expanded=true]]:not-sr-only pointer-coarse:not-sr-only">
        {shared.canWrite && (
          <button
            type="button"
            aria-label={`Add a page inside ${node.name}`}
            onClick={() => shared.actions.addPage(node)}
            className="flex size-8 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.08] hover:text-[color:var(--jd-ink)]"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        )}
        <DocNodeMenu
          name={node.name}
          actions={nodeActions(node, shared.canWrite, shared.actions).map((a) => ({
            ...a,
            run: () => {
              a.run();
              shared.onNavigate();
            },
          }))}
        />
      </div>
    </>
  );
}
