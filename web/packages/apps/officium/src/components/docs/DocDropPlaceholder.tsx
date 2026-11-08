import type { DropSlot } from "../../lib/docs/doc-drop-slot";

/**
 * Where the dragged row will land (JAVA-1550): a dashed outline the height of a row, sitting in the list at
 * the planned place so the rows below make room. It is drawn inside the group it belongs to, so the group's
 * own indent is the planned depth. Not a tree item: the dragged row is still in the tree, as a faint ghost.
 */
export function DocDropPlaceholder({ slot }: { slot: DropSlot }) {
  return (
    <div
      role="none"
      aria-hidden="true"
      data-testid="doc-drop-placeholder"
      data-parent={slot.parent}
      data-index={slot.index}
      data-depth={slot.depth}
      className="min-h-11 rounded-[var(--radius-jd-sm)] border border-dashed border-[color:var(--jd-ink)]/50 bg-[color:var(--jd-ink)]/[0.04]"
    />
  );
}
