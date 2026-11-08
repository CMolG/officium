"use client";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTreeNode, DocUpsertInput } from "../../lib/backlog/types";
import { DocNewPageDialog } from "./DocNewPageDialog";
import { DocNewTemplateDialog, type TemplateDraft } from "./DocNewTemplateDialog";
import { NewCollectionDialog } from "./NewCollectionDialog";
import { NodeAppearanceDialog } from "./NodeAppearanceDialog";
import type { useDocTreeMutations } from "./use-doc-tree-mutations";

/**
 * The dialogs the documentation asks its input in: a new page (with what it starts from), a new template
 * (JAVA-801), a node's look, a new collection.
 */
export function DocsDialogs({
  projectId,
  repository,
  mutations,
  templateDraft,
  takenPaths,
  treePaths,
  collections,
  onCloseTemplate,
  onCreate,
}: {
  projectId: string;
  repository: BacklogRepository;
  mutations: ReturnType<typeof useDocTreeMutations>;
  templateDraft: TemplateDraft | null;
  /** The paths pages hold. */
  takenPaths: ReadonlySet<string>;
  /** Every path the tree shows, a page's or not: what a template can't take. */
  treePaths: ReadonlySet<string>;
  collections: DocTreeNode[];
  onCloseTemplate: () => void;
  /** Resolves to an error to show, or `null` once the page exists and is open. */
  onCreate: (path: string, input: DocUpsertInput, icon?: string) => Promise<string | null>;
}) {
  return (
    <>
      {mutations.pageDraft && (
        <DocNewPageDialog
          projectId={projectId}
          repository={repository}
          draft={mutations.pageDraft}
          takenPaths={takenPaths}
          onClose={mutations.closePageDraft}
          onCreate={onCreate}
        />
      )}
      {templateDraft && (
        <DocNewTemplateDialog
          projectId={projectId}
          repository={repository}
          draft={templateDraft}
          collections={collections.map((c) => ({ path: c.path, name: c.name }))}
          takenPaths={treePaths}
          onClose={onCloseTemplate}
          onCreate={onCreate}
        />
      )}
      {mutations.appearance && (
        <NodeAppearanceDialog
          node={mutations.appearance}
          onClose={mutations.closeAppearance}
          onSubmit={(input) => mutations.saveAppearance(mutations.appearance as DocTreeNode, input)}
        />
      )}
      {mutations.newCollection && (
        <NewCollectionDialog
          takenPaths={new Set(collections.map((n) => n.path))}
          onClose={mutations.closeNewCollection}
          onSubmit={mutations.createCollection}
        />
      )}
    </>
  );
}
