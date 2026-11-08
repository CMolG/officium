/**
 * Which documentation folders a person opened, per project (JAVA-791). It is the EXPANDED set (JAVA-1549): every
 * folder starts collapsed and the person opens what they need; the open page's own ancestors are opened for them, so
 * the page is never hidden. The set lives under a new key: the old one held the collapsed set, which read as expanded
 * would have inverted everyone's tree.
 *
 * `localStorage` like `view-mode.ts`, read and written defensively: blocked storage only costs the remembered state,
 * never the tree.
 */
const keyOf = (projectId: string) => `officium:doc-tree:expanded:v1:${projectId}`;

/** What the tree asks of the fold: whether a node is collapsed. */
export type CollapsedNodes = Pick<ReadonlySet<string>, "has">;

export function readExpanded(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(keyOf(projectId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeExpanded(projectId: string, expanded: ReadonlySet<string>): void {
  try {
    localStorage.setItem(keyOf(projectId), JSON.stringify([...expanded]));
  } catch {
    // Blocked storage: the tree still works, it just forgets.
  }
}
