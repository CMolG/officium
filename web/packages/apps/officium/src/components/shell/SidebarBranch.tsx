import type { Tree } from "./sidebar-tree";
import type { Place } from "./sidebar-place";
import { SidebarFolderNode } from "./SidebarFolderNode";
import { SidebarProjectNode } from "./SidebarProjectNode";

/** The folders and projects of one level of the workspace tree, folders first. */
export function SidebarBranch({ parentId, tree, place }: { parentId: string | null; tree: Tree; place: Place }) {
  return (
    <>
      {(tree.folders.get(parentId) ?? []).map((folder) => {
        const empty = !tree.folders.get(folder.id)?.length && !tree.projects.get(folder.id)?.length;
        return (
          <SidebarFolderNode key={folder.id} folder={folder} empty={empty} place={place}>
            <SidebarBranch parentId={folder.id} tree={tree} place={place} />
          </SidebarFolderNode>
        );
      })}
      {(tree.projects.get(parentId) ?? []).map((project) => (
        <SidebarProjectNode key={project.id} project={project} place={place} />
      ))}
    </>
  );
}
