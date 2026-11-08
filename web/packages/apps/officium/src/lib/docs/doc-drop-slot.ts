import type { DocTreeNode } from "../backlog/types";
import { parentOf } from "./doc-path";
import type { Drop } from "./doc-move";
import { depthOf, findNode } from "./doc-tree";

/** Where a drag's placeholder sits (JAVA-1550): the group it is in and its place among that group's other rows. */
export interface DropSlot {
  /** The parent's path; "" is the top level. */
  parent: string;
  /** The index among the group's rows without the dragged one: the dragged row's own place does not count. */
  index: number;
  /** The depth the dragged row would have there (1 is the top level). */
  depth: number;
}

const byName = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase()) || a.localeCompare(b);

/**
 * The slot a planned drop of `from` fills, read from the tree as it is NOW (the tree is not rearranged during
 * a drag, so the same drop always gives the same slot). A drop with no position nests as the last child, or in
 * an A to Z group files by name.
 */
export function slotOf(roots: DocTreeNode[], from: string, drop: Drop): DropSlot {
  const parent = parentOf(drop.to);
  const parentNode = parent ? findNode(roots, parent) : null;
  const others = (parent ? (parentNode?.children ?? []) : roots).filter((node) => node.path !== from);
  const depth = depthOf(drop.to);
  if (drop.position !== undefined) return { parent, index: Math.min(drop.position, others.length), depth };
  if (parentNode?.sortMode === "alphabetical") {
    const name = findNode(roots, from)?.name ?? "";
    const at = others.findIndex((node) => byName(name, node.name) < 0);
    return { parent, index: at < 0 ? others.length : at, depth };
  }
  return { parent, index: others.length, depth };
}
