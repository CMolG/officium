import type { DocSortMode, DocStar, DocTreeNode } from "../../lib/backlog/types";

/** What the tree can do to one node; the `…` menu and the feedback layer's menu share it (ADR 0029). */
export interface DocNodeActions {
  addPage: (node: DocTreeNode) => void;
  createOverview: (node: DocTreeNode) => void;
  chooseAppearance: (node: DocTreeNode) => void;
  setSortMode: (node: DocTreeNode, mode: DocSortMode) => void;
  deleteNode: (node: DocTreeNode) => void;
  moveTo: (node: DocTreeNode) => void;
  duplicate: (node: DocTreeNode) => void;
  /** Stars or unstars the node's page, or the node as a collection (JAVA-799). */
  toggleStar: (node: DocTreeNode, kind: DocStar["kind"]) => void;
  isStarred: (node: DocTreeNode, kind: DocStar["kind"]) => boolean;
  /** A blank template offered in this collection (JAVA-801). */
  newTemplate: (node: DocTreeNode) => void;
  /** Markdown files picked to become pages under the node: the keyboard and touch way to the drop. */
  importFiles: (node: DocTreeNode) => void;
}

export interface DocNodeAction {
  id:
    | "star-page"
    | "star-collection"
    | "add-page"
    | "new-template"
    | "import-files"
    | "create-overview"
    | "appearance"
    | "sort"
    | "move"
    | "duplicate"
    | "delete";
  label: string;
  run: () => void;
  danger?: boolean;
}

/**
 * The actions a node offers, in order. Starring is personal, so a viewer has it too; for a viewer nothing
 * else is shown: no edit entry ever appears.
 */
export function nodeActions(node: DocTreeNode, canWrite: boolean, actions: DocNodeActions): DocNodeAction[] {
  const list: DocNodeAction[] = [];
  const star = (kind: DocStar["kind"], noun: string) => {
    const starred = actions.isStarred(node, kind);
    list.push({ id: kind === "page" ? "star-page" : "star-collection", label: `${starred ? "Unstar" : "Star"} ${noun}`, run: () => actions.toggleStar(node, kind) });
  };
  if (node.page) star("page", "page");
  if (node.depth === 1) star("collection", "collection");
  if (!canWrite) return list;
  list.push({ id: "add-page", label: "Add a page inside", run: () => actions.addPage(node) });
  if (node.depth === 1) list.push({ id: "new-template", label: "New template here", run: () => actions.newTemplate(node) });
  list.push({ id: "import-files", label: "Import Markdown files…", run: () => actions.importFiles(node) });
  if (!node.page) list.push({ id: "create-overview", label: "Create the overview page", run: () => actions.createOverview(node) });
  list.push({ id: "appearance", label: "Icon and color", run: () => actions.chooseAppearance(node) });
  list.push({ id: "move", label: "Move to…", run: () => actions.moveTo(node) });
  if (node.page) list.push({ id: "duplicate", label: "Duplicate", run: () => actions.duplicate(node) });
  if (node.children.length > 0) {
    const next: DocSortMode = node.sortMode === "alphabetical" ? "manual" : "alphabetical";
    list.push({
      id: "sort",
      label: next === "alphabetical" ? "Sort pages A to Z" : "Sort pages by hand",
      run: () => actions.setSortMode(node, next),
    });
  }
  if (node.depth === 1 && !node.page && node.children.length === 0 && node.version > 0) {
    list.push({ id: "delete", label: "Delete this empty collection", run: () => actions.deleteNode(node), danger: true });
  }
  return list;
}
