import type { DocTreeNode } from "../backlog/types";
import { findNode, siblingsOf } from "./doc-tree";
import { parentOf } from "./doc-path";

/** Whether `candidate` is `root` or lives under it. */
export const atOrUnder = (candidate: string, root: string): boolean => candidate === root || candidate.startsWith(`${root}/`);

/** `path` as it reads once `from` became `to`. */
export const remapPath = (path: string, from: string, to: string): string => (path === from ? to : `${to}${path.slice(from.length)}`);

const segmentOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Where a node ends up when moved below `destination` ("" is the top level), keeping its own segment. */
export const resultPath = (destination: string, movedPath: string): string =>
  destination ? `${destination}/${segmentOf(movedPath)}` : segmentOf(movedPath);

/** A place a node can move to: the top level, or any shown node outside the moved one. */
export interface Destination {
  /** "" for the top level. */
  path: string;
  name: string;
  depth: number;
}

/** Every destination for `moved`, in tree order: the top level first, then nodes outside its own subtree. */
export function destinationsOf(roots: DocTreeNode[], moved: string): Destination[] {
  const walk = (nodes: DocTreeNode[]): Destination[] =>
    nodes.flatMap((node) =>
      atOrUnder(node.path, moved) ? [] : [{ path: node.path, name: node.name, depth: node.depth }, ...walk(node.children)],
    );
  return [{ path: "", name: "Top level", depth: 0 }, ...walk(roots)];
}

/** An ancestor of a page for the breadcrumb: a link when it has a page, plain text when it only holds pages. */
export interface Crumb {
  path: string;
  name: string;
  linked: boolean;
  /** The ancestor's own icon and colour, drawn beside its name (JAVA-1765). */
  icon: string | null;
  iconColor: string | null;
}

export function breadcrumbsOf(roots: DocTreeNode[], path: string): Crumb[] {
  const segments = path.split("/");
  return segments.slice(0, -1).map((_, i) => {
    const ancestor = segments.slice(0, i + 1).join("/");
    const node = findNode(roots, ancestor);
    return {
      path: ancestor,
      name: node?.name ?? segments[i],
      linked: Boolean(node?.page),
      icon: node?.icon ?? null,
      iconColor: node?.iconColor ?? null,
    };
  });
}

/** Where, inside the row a node is dragged over, the pointer is: the top third, the middle, the bottom third. */
export type DropZone = "before" | "inside" | "after";

export function zoneOf(clientY: number, rect: { top: number; height: number }): DropZone {
  const third = rect.height / 3;
  if (clientY < rect.top + third) return "before";
  return clientY > rect.top + 2 * third ? "after" : "inside";
}

/** What a drop asks of the API: the new path and, when it names a place among siblings, the position. */
export interface Drop {
  to: string;
  position?: number;
}

/**
 * The move a drop of `from` on the row `over` means, or `null` when it means nothing: the node over
 * itself or its own subtree, or nesting it where it already is. The middle third nests it as the
 * last child; the top and bottom thirds place it before or after `over` in its group.
 */
export function planDrop(roots: DocTreeNode[], from: string, over: string, zone: DropZone): Drop | null {
  if (atOrUnder(over, from)) return null;
  if (zone === "inside") {
    const to = resultPath(over, from);
    return to === from ? null : { to };
  }
  const parent = parentOf(over);
  const to = resultPath(parent, from);
  const parentNode = parent ? findNode(roots, parent) : null;
  if (parentNode?.sortMode === "alphabetical") return { to };
  const others = siblingsOf(roots, over).map((node) => node.path).filter((path) => path !== from);
  const at = others.indexOf(over);
  return { to, position: zone === "before" ? at : at + 1 };
}
