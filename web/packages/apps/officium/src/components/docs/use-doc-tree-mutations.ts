"use client";

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type DocSortMode, type DocTree, type DocTreeNode } from "../../lib/backlog/types";
import { findNode, moveWithin, siblingsOf } from "../../lib/docs/doc-tree";
import { useDocStars } from "../../lib/docs/use-doc-stars";
import type { DocNodeActions } from "./doc-node-actions";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");
const CONFLICT = "Someone changed the tree first, so it was reloaded. Try again.";

/** Where a page form opens: under a node (`prefix`), or as a node's own overview page (`path`); `fromTemplate`
 *  picks the template it starts from (JAVA-801). */
export interface PageDraft {
  prefix?: string;
  path?: string;
  title?: string;
  fromTemplate?: string;
}

/** What the tree does to a node by itself; templates and the import come from the view (JAVA-801). */
export type TreeNodeActions = Omit<DocNodeActions, "newTemplate" | "importFiles">;
/** One status line for the tree: a refused drop or copy (`useDocMoves`) speaks on it too, and whichever spoke last is shown. */
function useTreeNotice(movesNotice: string | null) {
  const [notice, setNotice] = useState<string | null>(null);
  const [heard, setHeard] = useState(movesNotice);
  if (movesNotice !== heard) {
    setHeard(movesNotice);
    setNotice(movesNotice);
  }
  return [notice, setNotice] as const;
}

/**
 * The writes of the documentation tree (JAVA-791) and the dialogs that ask for their input. A reorder
 * is applied at once and reverted by a re-read when the API refuses it, with the reason in `notice`.
 */
export function useDocTreeMutations({
  projectId,
  repository,
  tree,
  setTree,
  refresh,
  moveActions,
}: {
  projectId: string;
  repository: BacklogRepository;
  tree: DocTree | null;
  setTree: Dispatch<SetStateAction<DocTree | null>>;
  refresh: () => void;
  /** The moves (JAVA-792) live in their own hook; their menu entries and their refusals ride along here. */
  moveActions: Pick<DocNodeActions, "moveTo" | "duplicate"> & { notice: string | null };
}) {
  const [notice, setNotice] = useTreeNotice(moveActions.notice);
  const { moveTo, duplicate } = moveActions;
  const [appearance, setAppearance] = useState<DocTreeNode | null>(null);
  const [pageDraft, setPageDraft] = useState<PageDraft | null>(null);
  const [newCollection, setNewCollection] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const { toggle: toggleStar, isStarred } = useDocStars();

  /** Runs one node write; `null` once it is done, or what to tell the person. */
  const write = useCallback(
    async (run: () => Promise<unknown>): Promise<string | null> => {
      try {
        const result = await run();
        refresh();
        return isConflict(result as never) ? CONFLICT : null;
      } catch (err) {
        refresh();
        return messageOf(err);
      }
    },
    [refresh],
  );

  const reorder = useCallback(
    (node: DocTreeNode, position: number) => {
      const group = siblingsOf(tree?.collections ?? [], node.path);
      setTree((current) => (current ? { ...current, collections: moveWithin(current.collections, node.path, position) } : current));
      // One move in flight at a time: a reorder bumps the versions of the siblings it renumbers, so a
      // second press sent before the first lands would carry a stale version and revert for nothing.
      queue.current = queue.current.then(async () => {
        const problem = await write(async () => {
          const fresh = findNode((await repository.getDocTree(projectId)).collections, node.path);
          return repository.updateDocNode(projectId, node.path, { position, expectedVersion: fresh?.version ?? node.version });
        });
        setNotice(problem ?? `Moved ${node.name} to position ${position + 1} of ${group.length}.`);
      });
    },
    [tree, setTree, write, repository, projectId, setNotice],
  );

  const actions = useMemo<TreeNodeActions>(
    () => ({
      addPage: (node) => setPageDraft({ prefix: `${node.path}/` }),
      createOverview: (node) => setPageDraft({ path: node.path, title: node.name }),
      chooseAppearance: setAppearance,
      setSortMode: (node: DocTreeNode, mode: DocSortMode) =>
        void write(() => repository.updateDocNode(projectId, node.path, { sortMode: mode, expectedVersion: node.version })).then(
          (problem) => setNotice(problem ?? (mode === "alphabetical" ? `${node.name} is sorted A to Z.` : `${node.name} is sorted by hand.`)),
        ),
      moveTo,
      duplicate,
      deleteNode: (node) =>
        void write(() => repository.deleteDocNode(projectId, node.path, node.version)).then((problem) =>
          setNotice(problem ?? `Deleted the collection ${node.name}.`),
        ),
      toggleStar: (node, kind) => void toggleStar(node.path, kind),
      isStarred: (node, kind) => isStarred(node.path, kind),
    }),
    [write, repository, projectId, moveTo, duplicate, setNotice, toggleStar, isStarred],
  );

  /** A page's width (JAVA-795): shown at once, put back by a re-read if the API refuses it. */
  const saveAppearance = useCallback(
    async (node: DocTreeNode, input: { icon: string; iconColor: string }) => {
      const problem = await write(() =>
        repository.updateDocNode(projectId, node.path, { ...input, expectedVersion: node.version }),
      );
      if (!problem) setAppearance(null);
      return problem;
    },
    [write, repository, projectId],
  );

  const createCollection = useCallback(
    async (path: string) => {
      const problem = await write(() => repository.updateDocNode(projectId, path, {}));
      if (!problem) setNewCollection(false);
      return problem;
    },
    [write, repository, projectId],
  );

  return {
    notice,
    appearance,
    pageDraft,
    newCollection,
    actions,
    reorder,
    saveAppearance,
    createCollection,
    closeAppearance: () => setAppearance(null),
    closePageDraft: () => setPageDraft(null),
    openPageDraft: setPageDraft,
    openNewCollection: () => setNewCollection(true),
    closeNewCollection: () => setNewCollection(false),
    setNotice,
  };
}
