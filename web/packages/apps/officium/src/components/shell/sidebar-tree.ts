import type { Folder, Project } from "../../lib/backlog/types";

export interface Tree {
  folders: Map<string | null, Folder[]>;
  projects: Map<string | null, Project[]>;
}

/** Children by parent. A parent that isn't in the list (a folder not loaded yet, or gone) puts
 *  its children at the root rather than hiding them. */
export function buildTree(folders: Folder[], projects: Project[]): Tree {
  const known = new Set(folders.map((f) => f.id));
  const parent = (id: string | null) => (id && known.has(id) ? id : null);
  const tree: Tree = { folders: new Map(), projects: new Map() };
  for (const f of [...folders].sort((a, b) => a.name.localeCompare(b.name))) {
    const key = parent(f.parentId);
    tree.folders.set(key, [...(tree.folders.get(key) ?? []), f]);
  }
  for (const p of projects) {
    const key = parent(p.folderId);
    tree.projects.set(key, [...(tree.projects.get(key) ?? []), p]);
  }
  return tree;
}
