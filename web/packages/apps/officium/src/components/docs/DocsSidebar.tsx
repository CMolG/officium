"use client";

import { useCallback, useRef } from "react";
import { NavGroupLabel, ShortcutKeys } from "@javadaba/ui";
import { Search } from "lucide-react";

import type { DocTree as DocTreeData, DocTreeNode } from "../../lib/backlog/types";
import type { Drop } from "../../lib/docs/doc-move";
import { BUILTIN_PREFIX } from "../../lib/docs/doc-path";
import { DOC_SHORTCUTS } from "../../lib/docs/doc-shortcuts";
import type { DocNodeActions } from "./doc-node-actions";
import { boardPath } from "../../lib/backlog/search-links";
import { SectionBack } from "../shell/SectionBack";
import { DocTree } from "./DocTree";
import { PinnedDocLinks } from "./PinnedDocLinks";
import { StarredList } from "./StarredList";
import type { CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

/**
 * What the documentation sidebar holds (JAVA-799), in the order a person reaches for it: the search button
 * that opens the command menu, what they starred, the pinned sections, then the tree. The desktop frame
 * (`SidebarFrame`) and the phone's drawer both wear it.
 */
export function DocsSidebar({
  projectId,
  tree,
  selected,
  sectionCurrent,
  canWrite,
  pendingCount,
  collapsed,
  notice,
  actions,
  onToggle,
  onOpen,
  onNavigate,
  onReorder,
  onDropMove,
  onDropFiles,
  onSearch,
}: {
  projectId: string;
  tree: DocTreeData;
  /** The open page, for the tree's and the starred list's current mark. */
  selected: string | null;
  /** The open page or reserved section, for the pinned links' current mark. */
  sectionCurrent: string | null;
  canWrite: boolean;
  pendingCount: number | null;
  collapsed: CollapsedNodes;
  notice: string | null;
  actions: DocNodeActions;
  onToggle: (path: string) => void;
  onOpen: (node: DocTreeNode) => void;
  onNavigate: () => void;
  onReorder: (node: DocTreeNode, position: number) => void;
  /** A drop that re-nests or moves to another group (JAVA-792). */
  onDropMove: (node: DocTreeNode, drop: Drop) => void;
  onDropFiles: (node: DocTreeNode, files: File[]) => void;
  onSearch: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  /** A collection with no overview page can't be opened: show it in the tree instead. */
  const reveal = useCallback(
    (path: string) => {
      if (collapsed.has(path)) onToggle(path);
      requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[role="treeitem"][data-doc-path="${CSS.escape(path)}"]`)?.focus());
    },
    [collapsed, onToggle],
  );

  return (
    <div ref={root} className="flex flex-col gap-2">
      <SectionBack href={boardPath(projectId)} label="Back to the board" onNavigate={onNavigate} />
      <button
        type="button"
        onClick={onSearch}
        data-testid="doc-search-button"
        className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-control-border)] px-2 text-left text-sm text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]"
      >
        <Search size={14} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">Search pages</span>
        <ShortcutKeys combo={DOC_SHORTCUTS.menu} />
      </button>
      <StarredList projectId={projectId} current={selected} onNavigate={onNavigate} onReveal={reveal} />
      <NavGroupLabel className="px-2 pt-2">Sections</NavGroupLabel>
      <PinnedDocLinks
        projectId={projectId}
        current={sectionCurrent}
        pinnedPages={tree.pinned}
        pendingCount={pendingCount}
        canWrite={canWrite}
        builtinCollapsed={collapsed.has(BUILTIN_PREFIX)}
        onToggleBuiltin={() => onToggle(BUILTIN_PREFIX)}
        onNavigate={onNavigate}
      />
      <NavGroupLabel className="px-2 pt-2">Pages</NavGroupLabel>
      <DocTree
        nodes={tree.collections}
        projectId={projectId}
        current={selected}
        canWrite={canWrite}
        collapsed={collapsed}
        notice={notice}
        actions={actions}
        onToggle={onToggle}
        onOpen={onOpen}
        onNavigate={onNavigate}
        onReorder={onReorder}
        onDropMove={onDropMove}
        onDropFiles={onDropFiles}
      />
    </div>
  );
}
