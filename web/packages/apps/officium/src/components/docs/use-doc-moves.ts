"use client";

import { useCallback, useMemo, useState } from "react";
import type { UndoNoticeController } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, isMoveConflict, type DocTree, type DocTreeNode } from "../../lib/backlog/types";
import { parentOf } from "../../lib/docs/doc-path";
import type { Drop } from "../../lib/docs/doc-move";
import { findNode, siblingsOf } from "../../lib/docs/doc-tree";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");
const CONFLICT = "Someone changed the tree first, so it was reloaded. Try again.";

type Offer = Parameters<UndoNoticeController["offer"]>[0];

export interface DocMoves {
  /** The node whose "Move to…" dialog is open. */
  moving: DocTreeNode | null;
  openMove: (node: DocTreeNode) => void;
  closeMove: () => void;
  /** Moves a node and offers to put it back; resolves to what to tell the person, `null` once done. */
  move: (node: DocTreeNode, input: { to: string; position?: number }) => Promise<string | null>;
  /** Copies a page and offers to remove the copy. */
  duplicate: (node: DocTreeNode) => Promise<string | null>;
  /** A drop on the tree: the move, with its refusal kept in `notice`. */
  drop: (node: DocTreeNode, drop: Drop) => void;
  /** The last refusal of a drop or a duplicate, for the tree's status line. */
  notice: string | null;
}

/**
 * The moves of the documentation tree (JAVA-792): "Move to…", drag-and-drop re-nesting and duplicate.
 * A move is reversible, so it gets Undo rather than a confirmation (interface-psychology, "When a
 * change adds friction"), through the view's one `undo` notice. A refusal reverts by a re-read and says
 * why, naming the taken paths. The view stays mounted when a move re-addresses the open page (JAVA-1536), so the
 * notice, and the sentence its Undo ends with, stay on screen through the navigation.
 */
export function useDocMoves({
  projectId,
  repository,
  tree,
  refresh,
  undo,
  onMoved,
}: {
  projectId: string;
  repository: BacklogRepository;
  tree: DocTree | null;
  refresh: () => void;
  undo: UndoNoticeController;
  /** Where a node landed, after a move or its undo: the tree opens the folders above it (JAVA-1549). */
  onMoved?: (path: string) => void;
}): DocMoves {
  const [moving, setMoving] = useState<DocTreeNode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const roots = tree?.collections;
  const { offer } = undo;

  const move = useCallback(
    async (node: DocTreeNode, input: { to: string; position?: number }): Promise<string | null> => {
      const parent = parentOf(node.path);
      const manual = (parent ? findNode(roots ?? [], parent)?.sortMode : "manual") !== "alphabetical";
      const place = manual ? siblingsOf(roots ?? [], node.path).findIndex((sibling) => sibling.path === node.path) : -1;
      try {
        const result = await repository.moveDoc(projectId, node.path, { ...input, expectedVersion: node.version });
        refresh();
        if (isMoveConflict(result)) return CONFLICT;
        const at = result.node.path;
        onMoved?.(at);
        const offered: Offer = {
          message: `Moved ${node.name} to ${at}.`,
          undone: `${node.name} is back at ${node.path}.`,
          undo: async () => {
            const back = await repository.moveDoc(projectId, at, { to: node.path, ...(place >= 0 ? { position: place } : {}) });
            refresh();
            if (isMoveConflict(back)) throw new Error(CONFLICT);
            onMoved?.(node.path);
          },
        };
        offer(offered);
        return null;
      } catch (err) {
        refresh();
        return messageOf(err);
      }
    },
    [roots, repository, projectId, refresh, offer, onMoved],
  );

  const duplicate = useCallback(
    async (node: DocTreeNode): Promise<string | null> => {
      try {
        const copy = await repository.duplicateDoc(projectId, node.path);
        refresh();
        offer({
          message: `Copied ${node.name} to ${copy.path}.`,
          undone: `Removed the copy at ${copy.path}.`,
          undo: async () => {
            const removed = await repository.deleteDoc(projectId, copy.path, copy.version);
            refresh();
            if (removed && isConflict(removed)) {
              throw new Error(`The copy at ${copy.path} was edited since, so it was kept. Delete it from its page if you don't need it.`);
            }
          },
        });
        return null;
      } catch (err) {
        refresh();
        return messageOf(err);
      }
    },
    [repository, projectId, refresh, offer],
  );

  // Cleared first, so the same refusal twice in a row is heard twice on the tree's status line.
  const drop = useCallback(
    (node: DocTreeNode, planned: Drop) => {
      setNotice(null);
      void move(node, planned).then(setNotice);
    },
    [move],
  );
  const duplicateAndTell = useCallback(
    (node: DocTreeNode) => {
      setNotice(null);
      return duplicate(node).then((problem) => (setNotice(problem), problem));
    },
    [duplicate],
  );

  return useMemo(
    () => ({ moving, openMove: setMoving, closeMove: () => setMoving(null), move, duplicate: duplicateAndTell, drop, notice }),
    [moving, move, duplicateAndTell, drop, notice],
  );
}
