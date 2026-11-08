"use client";

import { useCallback, useMemo, useState } from "react";

import { ancestorsOf } from "../../lib/docs/doc-tree";
import { readExpanded, writeExpanded, type CollapsedNodes } from "../../lib/docs/doc-tree-collapsed";

/**
 * Which tree nodes are collapsed (JAVA-791), kept per viewer. Every folder starts collapsed and the person's expanded
 * folders are remembered (JAVA-1549). Opening a page opens the sections above it, so the tree always shows where you
 * are: derived while rendering, once per page, so collapsing a section afterwards sticks. Opening a page in another parent
 * folds the parents it left. Split from `DocsView` in JAVA-801.
 */
export function useTreeCollapse(projectId: string, selected: string | null, chosen: boolean) {
  // `chosen`: the page was asked for (an address or a click), not the one the view opens by default while the tree loads.
  // Read once: the tree only renders after its data arrives, so a stored set never mismatches the server.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => readExpanded(projectId));
  const [openedPath, setOpenedPath] = useState<string | null>(null);

  if (selected !== openedPath) {
    setOpenedPath(selected);
    if (selected) {
      // Moving into another parent folds the others (Doc-Sections, "Parents fold", JAVA-1767); the first page a visit opens
      // leaves what the person remembered alone.
      const top = selected.split("/")[0]!;
      const leaving = chosen && openedPath !== null && openedPath.split("/")[0] !== top;
      const kept = leaving ? [...expanded].filter((path) => path === top || path.startsWith(`${top}/`)) : [...expanded];
      const next = new Set([...kept, ...ancestorsOf(selected)]);
      if (next.size !== expanded.size || kept.length !== expanded.size) setExpanded(next);
    }
  }

  const toggle = useCallback(
    (nodePath: string) =>
      setExpanded((current) => {
        const next = new Set(current);
        if (!next.delete(nodePath)) next.add(nodePath);
        writeExpanded(projectId, next);
        return next;
      }),
    [projectId],
  );

  // Opens the folders above a path that just moved there, so a page dropped into a collapsed folder stays in sight.
  const reveal = useCallback(
    (nodePath: string) =>
      setExpanded((current) => {
        const above = ancestorsOf(nodePath);
        if (above.every((a) => current.has(a))) return current;
        const next = new Set(current);
        above.forEach((a) => next.add(a));
        writeExpanded(projectId, next);
        return next;
      }),
    [projectId],
  );

  const collapsed = useMemo<CollapsedNodes>(() => ({ has: (nodePath) => !expanded.has(nodePath) }), [expanded]);
  return { collapsed, toggle, reveal };
}
