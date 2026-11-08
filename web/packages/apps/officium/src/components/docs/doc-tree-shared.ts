import type { DocTreeNode } from "../../lib/backlog/types";
import type { DropSlot } from "../../lib/docs/doc-drop-slot";
import type { DocNodeActions } from "./doc-node-actions";
import type { CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

/** What every row of the documentation tree needs from the tree that renders it (JAVA-791). */
export interface DocTreeShared {
  projectId: string;
  /** The open page's path; the roving tab stop starts there. */
  current: string | null;
  canWrite: boolean;
  collapsed: CollapsedNodes;
  /** The path that holds the tree's one tab stop. */
  tabStop: string | null;
  toggle: (path: string) => void;
  open: (node: DocTreeNode) => void;
  onNavigate: () => void;
  actions: DocNodeActions;
  /** Files dropped on a node become pages under it (JAVA-801). */
  dropFiles: (node: DocTreeNode, files: File[]) => void;
  /** Moves a node one place among its siblings (Alt+Arrow); a no-op where the group is A to Z. */
  move: (node: DocTreeNode, delta: -1 | 1) => void;
  focusRelative: (node: DocTreeNode, key: string) => void;
  register: (path: string, element: HTMLElement | null) => void;
  setTabStop: (path: string) => void;
  /** Where the dragged row would land, or null when nothing is dragged or the pointer is on no legal place (JAVA-1550). */
  slot: DropSlot | null;
  /** The path of the row being dragged. */
  dragging: string | null;
}
