"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@javadaba/ui/navigation";
import { UndoNotice } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { docsPath } from "../../lib/backlog/search-links";
import { isConflict, type DocPage, type DocTreeNode, type DocUpsertInput } from "../../lib/backlog/types";
import { usePendingChangelogCount } from "../../lib/docs/changelog-count";
import { breadcrumbsOf, resultPath } from "../../lib/docs/doc-move";
import { templateCollection } from "../../lib/docs/doc-template";
import { findNode, nodePathsOf, pagesOf } from "../../lib/docs/doc-tree";
import { clearPendingEdit, isPendingEdit, markPendingEdit } from "../../lib/docs/pending-edit";
import { useDocDeleteUndo } from "../../lib/docs/use-doc-delete-undo";
import type { DocNodeActions } from "./doc-node-actions";
import type { TemplateDraft } from "./DocNewTemplateDialog";
import { DocPagePanel } from "./DocPagePanel";
import { DocsDialogs } from "./DocsDialogs";
import { DocsEmptyState } from "./DocsEmptyState";
import { DocsHeader } from "./DocsHeader";
import { DocsLoadState } from "./DocsLoadState";
import { DocsSectionPanel, sectionOf } from "./DocsSectionPanel";
import { DocsSidebar } from "./DocsSidebar";
import { SidebarFrame } from "../shell/SidebarFrame";
import { SidebarDrawer } from "../shell/SidebarDrawer";
import { DOCS_SIDEBAR_FRAME } from "./docs-sidebar-keys";
import { DocsToolbar } from "./DocsToolbar";
import { MoveDocDialog } from "./MoveDocDialog";
import { useDocImport } from "./use-doc-import";
import { useDocMoves } from "./use-doc-moves";
import { useDocOverlays } from "./use-doc-overlays";
import { useDocTreeMutations } from "./use-doc-tree-mutations";
import { useDocsData } from "./use-docs-data";
import { refuseFileDrop } from "./use-file-drop";
import { useTreeCollapse } from "./use-tree-collapse";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * A project's Documentation (JAVA-131): Markdown pages that people write here and agents read and
 * update through MCP (`docs.*`, officium-api.md §8.7). The sidebar on the left (search, your stars,
 * the pinned sections and the tree you can collapse, order, re-nest and style, JAVA-791, JAVA-792,
 * JAVA-799), the page on the right; on a phone the sidebar is a drawer behind "Pages". Templates and
 * the Markdown import (JAVA-801) start here: a file dropped anywhere but on a node is refused, never
 * opened by the browser.
 */
export function DocsView({ projectId, path }: { projectId: string; path: string | null }) {
  const router = useRouter();
  const repository = useMemo(() => getBacklogRepository(), []);
  const { project, tree, setTree, error, retry, liveTick, live, refresh } = useDocsData(projectId, repository);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft | null>(null);

  const canWrite = project !== null && project.role !== "viewer";
  const section = sectionOf(path);
  const collections = useMemo(() => tree?.collections ?? [], [tree]);
  const ownPages = useMemo(() => pagesOf(collections), [collections]);
  const takenPaths = useMemo(() => new Set([...ownPages, ...(tree?.pinned ?? [])].map((p) => p.path)), [ownPages, tree]);
  const treePaths = useMemo(() => new Set([...takenPaths, ...nodePathsOf(collections)]), [takenPaths, collections]);
  const selected = section ? null : (path ?? ownPages[0]?.path ?? tree?.pinned[0]?.path ?? null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const { undo, onDeleted } = useDocDeleteUndo(projectId, repository, refresh);
  const { collapsed, toggle, reveal } = useTreeCollapse(projectId, selected, path !== null && section === null);
  const moves = useDocMoves({ projectId, repository, tree, refresh, undo, onMoved: reveal });
  const moveActions = useMemo(() => ({ moveTo: moves.openMove, duplicate: (node: DocTreeNode) => void moves.duplicate(node), notice: moves.notice }), [moves]);
  const mutations = useDocTreeMutations({ projectId, repository, tree, setTree, refresh, moveActions });

  const pendingCount = usePendingChangelogCount(projectId);
  const node = useMemo(() => (selected ? findNode(collections, selected) : null), [selected, collections]);
  const titles = useMemo(() => new Map([...ownPages, ...(tree?.pinned ?? [])].map((p) => [p.path, p.title])), [ownPages, tree]);
  const imports = useDocImport({ projectId, repository, currentPath: path, takenPaths: treePaths, refresh });
  const { pick: pickFiles, start: importFiles } = imports;
  const actions = useMemo<DocNodeActions>(
    () => ({ ...mutations.actions, newTemplate: (at) => setTemplateDraft({ where: at.path }), importFiles: (at) => pickFiles(at.path) }),
    [mutations.actions, pickFiles],
  );
  const dropFiles = useCallback((at: DocTreeNode, files: File[]) => void importFiles(at.path, files), [importFiles]);
  const overlays = useDocOverlays({
    projectId,
    repository,
    tree,
    currentPath: selected,
    canWrite,
    onNewPage: (title) => mutations.openPageDraft(title ? { title } : {}),
    onNewCollection: mutations.openNewCollection,
  });
  const newFromTemplate = (template: Pick<DocPage, "path">) => {
    const collection = templateCollection(template.path);
    mutations.openPageDraft({ prefix: collection ? `${collection}/` : "", fromTemplate: template.path });
  };

  const open = useCallback(
    (at: DocTreeNode) => {
      if (!at.page) return toggle(at.path);
      closeDrawer();
      router.push(docsPath(projectId, at.path));
    },
    [toggle, closeDrawer, router, projectId],
  );

  /** A page, a template or a page from one: the new page opens in the editor at its address. */
  async function create(at: string, input: DocUpsertInput, icon?: string): Promise<string | null> {
    try {
      const result = await repository.upsertDoc(projectId, at, input);
      if (isConflict(result)) return "Another page already lives at this path.";
      // The icon is looks only: a page that was made keeps going if it could not be set (JAVA-1765).
      if (icon) await repository.updateDocNode(projectId, result.path, { icon }).catch(() => undefined);
      mutations.closePageDraft();
      setTemplateDraft(null);
      setDrawerOpen(false);
      markPendingEdit(result.path);
      refresh();
      router.push(docsPath(projectId, result.path));
      return null;
    } catch (err) {
      return messageOf(err);
    }
  }

  const toolbar = canWrite && <DocsToolbar onNewPage={() => mutations.openPageDraft({})} onNewCollection={mutations.openNewCollection} />;

  const nav = tree && (
    <DocsSidebar
      projectId={projectId}
      tree={tree}
      selected={selected}
      sectionCurrent={section ? path : selected}
      canWrite={canWrite}
      pendingCount={pendingCount}
      collapsed={collapsed}
      notice={mutations.notice}
      actions={actions}
      onToggle={toggle}
      onOpen={open}
      onNavigate={closeDrawer}
      onReorder={mutations.reorder}
      onDropMove={moves.drop}
      onDropFiles={dropFiles}
      onSearch={() => {
        closeDrawer();
        overlays.openMenu();
      }}
    />
  );

  const empty = ownPages.length === 0 && !section && path === null;

  // From `md` up the view holds the shell's height and nothing in it scrolls the window (JAVA-1535): the sidebar,
  // the page and its contents each scroll in their own pane, and the headers above them stay put.
  return (
    <div onDragOver={refuseFileDrop} onDrop={refuseFileDrop} className="officium-rise flex w-full flex-col md:h-full md:min-h-0 md:flex-row">
      {tree !== null && !empty && <SidebarFrame keys={DOCS_SIDEBAR_FRAME}>{nav}</SidebarFrame>}
      <div data-testid="docs-main" className="officium-docs-main flex w-full min-w-0 flex-1 flex-col gap-5 px-4 pt-6 sm:px-6 md:min-h-0">
        <DocsHeader
          showControls={tree !== null && (takenPaths.size > 0 || section !== null)}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          toolbar={toolbar}
        />

        {live === "reconnecting" && (
          <p role="status" className="text-xs text-[color:var(--jd-muted)]">
            Reconnecting… changes made elsewhere will show once the connection is back.
          </p>
        )}

        <UndoNotice controller={undo} />
        {imports.element}

        {tree === null ? (
          <DocsLoadState error={error} onRetry={retry} />
        ) : empty ? (
          <div className="pb-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
            <DocsEmptyState canWrite={canWrite} onCreatePage={() => mutations.openPageDraft({})} onNewCollection={mutations.openNewCollection}>
              {nav}
            </DocsEmptyState>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col md:min-h-0 md:flex-1">
            {error && (
              <p role="alert" className="mb-3 text-sm font-medium text-destructive">
                Couldn&apos;t refresh the pages: {error}
              </p>
            )}
            {section && (
              <div className="pb-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain" data-testid="doc-section-scroll">
                <DocsSectionPanel
                  section={section}
                  projectId={projectId}
                  repository={repository}
                  pages={[...ownPages, ...tree.pinned]}
                  collections={collections}
                  canWrite={canWrite}
                  isOwner={project?.role === "owner"}
                  liveTick={liveTick}
                  onChanged={refresh}
                  onNewTemplate={() => setTemplateDraft({ where: null })}
                  onNewFromTemplate={newFromTemplate}
                />
              </div>
            )}
            {selected && (
              <DocPagePanel
                key={path ?? `index:${selected}`}
                projectId={projectId}
                path={selected}
                repository={repository}
                canWrite={canWrite}
                owner={project?.role === "owner"}
                startEditing={isPendingEdit(path)}
                takenPaths={new Set([...takenPaths].filter((p) => p !== selected))}
                onAutoEditUsed={clearPendingEdit}
                onChanged={refresh}
                onMoved={(next) => router.replace(docsPath(projectId, next))}
                onDeleted={onDeleted}
                node={node}
                crumbs={breadcrumbsOf(collections, selected)}
                onMove={node ? () => moves.openMove(node) : undefined}
                onDuplicate={node ? () => void moves.duplicate(node) : undefined}
                titles={titles}
                onNewFromTemplate={newFromTemplate}
                onMakeTemplate={(page) => setTemplateDraft({ where: templateCollection(page.path), source: page })}
              />
            )}
          </div>
        )}
      </div>

      {drawerOpen && tree !== null && (
        <SidebarDrawer title="Pages" closeLabel="Close pages" testId="doc-drawer" onClose={closeDrawer}>
          {nav}
          {toolbar}
        </SidebarDrawer>
      )}
      {moves.moving && (
        <MoveDocDialog
          node={moves.moving}
          roots={collections}
          onClose={moves.closeMove}
          onSubmit={async (destination) => {
            const problem = await moves.move(moves.moving as DocTreeNode, { to: resultPath(destination, (moves.moving as DocTreeNode).path) });
            if (!problem) moves.closeMove();
            return problem;
          }}
        />
      )}

      <DocsDialogs
        projectId={projectId}
        repository={repository}
        mutations={mutations}
        templateDraft={templateDraft}
        takenPaths={takenPaths}
        treePaths={treePaths}
        collections={collections}
        onCloseTemplate={() => setTemplateDraft(null)}
        onCreate={create}
      />
      {overlays.element}
    </div>
  );
}
