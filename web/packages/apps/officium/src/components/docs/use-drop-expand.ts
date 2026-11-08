"use client";

import { useEffect, useRef } from "react";

import type { DocTreeNode } from "../../lib/backlog/types";
import { findNode } from "../../lib/docs/doc-tree";
import type { CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

/** How long a dragged row rests over a collapsed folder before the folder opens (JAVA-1550). */
export const EXPAND_DELAY_MS = 600;

/**
 * Opens a collapsed folder a dragged row is held over, in its middle third, with the tree's own toggle.
 * Moving off the folder before the delay cancels it. `target` is the path under the pointer in the
 * `inside` zone, or null.
 */
export function useDropExpand(
  target: string | null,
  nodes: DocTreeNode[],
  collapsed: CollapsedNodes,
  toggle: (path: string) => void,
) {
  const latest = useRef({ collapsed, toggle });
  useEffect(() => {
    latest.current = { collapsed, toggle };
  });
  const node = target ? findNode(nodes, target) : null;
  const waiting = node && node.children.length > 0 && collapsed.has(node.path) ? node.path : null;
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => {
      if (latest.current.collapsed.has(waiting)) latest.current.toggle(waiting);
    }, EXPAND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waiting]);
}
