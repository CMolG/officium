import { DragOverlay } from "@dnd-kit/core";

import type { DocTreeNode } from "../../lib/backlog/types";
import { DocNodeIcon } from "./DocNodeIcon";

/**
 * What follows the pointer while a row is dragged (JAVA-1550): a compact snapshot, icon and title. It is
 * rendered through a portal by the tree, so no scrolling sidebar clips it. The row it came from stays in
 * the tree as a faint ghost.
 */
export function DocDragOverlay({ node }: { node: DocTreeNode }) {
  const isSection = !node.page || node.children.length > 0 || node.depth === 1;
  return (
    <DragOverlay dropAnimation={null} style={{ width: "max-content", height: "auto", maxWidth: 260 }}>
      <div
        data-testid="doc-drag-overlay"
        className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] px-3 text-sm font-semibold text-[color:var(--jd-ink)] shadow-lg"
      >
        <DocNodeIcon icon={node.icon} color={node.iconColor} isSection={isSection} />
        <span className="min-w-0 truncate">{node.name}</span>
      </div>
    </DragOverlay>
  );
}
