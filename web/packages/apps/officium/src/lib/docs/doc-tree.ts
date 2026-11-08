import type { DocPageSummary, DocSortMode, DocTreeNode } from "../backlog/types";

/** The layout row of one path (officium-api.md §8.17): present only for a collection or a node somebody
 *  styled or reordered. */
export interface DocNodeRow {
  path: string;
  icon: string | null;
  iconColor: string | null;
  sortMode: DocSortMode;
  position: number | null;
  version: number;
  fullWidth: boolean;
}

export const depthOf = (path: string): number => path.split("/").length;

const lower = (text: string) => text.toLowerCase();

/**
 * The TS twin of the API's `DocTree` (the in-memory backend builds the tree with it; the real one comes
 * from `GET …/docs:tree`). Shown: every page and each of its prefixes, plus every depth-1 row, so an empty
 * collection shows. A row below depth 1 with no page and nothing under it is hidden. Siblings are ordered
 * by their parent's sort mode; the root is always manual.
 */
export function buildDocTree(pages: DocPageSummary[], rows: Iterable<DocNodeRow>): DocTreeNode[] {
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const byRow = new Map<string, DocNodeRow>();
  const shown = new Set<string>();
  for (const page of pages) {
    const segments = page.path.split("/");
    for (let i = 1; i <= segments.length; i += 1) shown.add(segments.slice(0, i).join("/"));
  }
  for (const row of rows) {
    byRow.set(row.path, row);
    if (depthOf(row.path) === 1 && row.version > 0) shown.add(row.path);
  }
  const childrenOf = (parent: string | null, mode: DocSortMode): DocTreeNode[] => {
    const nodes: DocTreeNode[] = [];
    for (const path of shown) {
      const slash = path.lastIndexOf("/");
      if ((parent === null ? slash >= 0 : slash < 0 || path.slice(0, slash) !== parent)) continue;
      const row = byRow.get(path);
      const page = byPath.get(path) ?? null;
      const segment = path.slice(slash + 1);
      const sortMode = row?.sortMode ?? "manual";
      nodes.push({
        path,
        segment,
        depth: depthOf(path),
        name: page?.title ?? segment,
        icon: row?.icon ?? null,
        iconColor: row?.iconColor ?? null,
        sortMode,
        position: row?.position ?? null,
        version: row?.version ?? 0,
        fullWidth: row?.fullWidth ?? false,
        page,
        children: childrenOf(path, sortMode),
      });
    }
    return nodes.sort(comparator(mode));
  };
  return childrenOf(null, "manual");
}

function comparator(mode: DocSortMode): (a: DocTreeNode, b: DocTreeNode) => number {
  const byName = (a: DocTreeNode, b: DocTreeNode) =>
    lower(a.name).localeCompare(lower(b.name)) || a.name.localeCompare(b.name) || a.path.localeCompare(b.path);
  if (mode === "alphabetical") return byName;
  return (a, b) => {
    if ((a.position === null) !== (b.position === null)) return a.position === null ? 1 : -1;
    return (a.position ?? 0) - (b.position ?? 0) || byName(a, b);
  };
}

export function findNode(nodes: DocTreeNode[], path: string): DocTreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (path.startsWith(`${node.path}/`)) return findNode(node.children, path);
  }
  return null;
}

/** The shown siblings of the node at `path`, itself included, in order. */
export function siblingsOf(roots: DocTreeNode[], path: string): DocTreeNode[] {
  const slash = path.lastIndexOf("/");
  if (slash < 0) return roots;
  return findNode(roots, path.slice(0, slash))?.children ?? [];
}

/** Every ancestor path of `path`, outermost first ("a/b/c" -> ["a", "a/b"]). */
export function ancestorsOf(path: string): string[] {
  const segments = path.split("/");
  return segments.slice(0, -1).map((_, i) => segments.slice(0, i + 1).join("/"));
}

/** Every node's path, a page's or not: what a new template or an imported file may not take (JAVA-801). */
export function nodePathsOf(roots: DocTreeNode[]): string[] {
  return roots.flatMap((node) => [node.path, ...nodePathsOf(node.children)]);
}

/** Every page of a tree, pinned ones first: what the flat `docs` list used to be. */
export function pagesOf(roots: DocTreeNode[]): DocPageSummary[] {
  return roots.flatMap((node) => [...(node.page ? [node.page] : []), ...pagesOf(node.children)]);
}

/** The tree after moving the node at `path` to `position` among its siblings, for an optimistic
 *  update; the API renumbers the group the same way (0..n-1, the moved node at `position`). */
export function moveWithin(roots: DocTreeNode[], path: string, position: number): DocTreeNode[] {
  const reorder = (level: DocTreeNode[]): DocTreeNode[] => {
    const from = level.findIndex((node) => node.path === path);
    if (from < 0) return level.map((node) => ({ ...node, children: reorder(node.children) }));
    const moved = level[from];
    const rest = level.filter((node) => node.path !== path);
    rest.splice(Math.max(0, Math.min(position, rest.length)), 0, moved);
    return rest.map((node, index) => ({ ...node, position: index }));
  };
  return reorder(roots);
}
