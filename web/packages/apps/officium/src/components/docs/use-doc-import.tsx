"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "@javadaba/ui/navigation";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { docsPath } from "../../lib/backlog/search-links";
import { isConflict } from "../../lib/backlog/types";
import {
  IMPORT_ACCEPT,
  planImport,
  readImportFiles,
  type SkippedFile,
  withTemplatePaths,
} from "../../lib/docs/markdown-files";
import { DocImportNotice, type ImportedPage, type ImportState } from "./DocImportNotice";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * Markdown files dropped on a node, or picked from its menu, written as pages (JAVA-801, design §6): one `PUT` per
 * file, published, so a file is never half imported. The first `storage_quota_exceeded` stops it; the pages already
 * made stay, with Undo. `element` is the hidden picker and the notice, rendered once by the view. One imported file
 * opens, and an undo leaves an imported page that was open: the view stays mounted through both (JAVA-1536), and so
 * does the notice.
 */
export function useDocImport({
  projectId,
  repository,
  currentPath,
  takenPaths,
  refresh,
}: {
  projectId: string;
  repository: BacklogRepository;
  currentPath: string | null;
  /** Every path the tree shows, nor any template's: an imported page takes none of them. */
  takenPaths: ReadonlySet<string>;
  refresh: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const target = useRef("");
  const [state, setState] = useState<ImportState | null>(null);

  const start = useCallback(
    async (parent: string, files: File[]) => {
      if (files.length === 0) return;
      setState({ kind: "running", count: files.length });
      const { read, unreadable } = await readImportFiles(files);
      // A template's path is not in the tree, so the server would refuse a page there: the drop plans around it.
      // If the list can't be read, the drop plans against the tree alone and the server still refuses a clash.
      const templates = await repository.listDocTemplates(projectId).catch(() => []);
      const plan = planImport(read, parent, withTemplatePaths(takenPaths, templates));
      const imported: ImportedPage[] = [];
      const skipped: SkippedFile[] = [...unreadable, ...plan.skipped];
      let left: string[] = [];
      for (const [at, page] of plan.pages.entries()) {
        try {
          const result = await repository.upsertDoc(projectId, page.path, { title: page.title, body: page.body });
          if (isConflict(result)) skipped.push({ file: page.file, reason: `a page took ${page.path} meanwhile` });
          else imported.push({ path: result.path, title: result.title, version: result.version });
        } catch (err) {
          if (err instanceof ApiError && err.code === "storage_quota_exceeded") {
            left = plan.pages.slice(at).map((p) => p.file);
            break;
          }
          skipped.push({ file: page.file, reason: messageOf(err) });
        }
      }
      refresh();
      setState({ kind: "done", imported, skipped, left });
      if (imported.length === 1) router.push(docsPath(projectId, imported[0].path));
    },
    [projectId, repository, takenPaths, refresh, router],
  );

  const undo = useCallback(async () => {
    if (state?.kind !== "done") return;
    const kept: string[] = [];
    for (const page of state.imported) {
      const result = await repository.deleteDoc(projectId, page.path, page.version).catch((err: unknown) => messageOf(err));
      if (typeof result === "string" || (result && isConflict(result))) kept.push(page.title);
    }
    refresh();
    setState({ kind: "undone", removed: state.imported.length - kept.length, kept });
    if (state.imported.some((page) => page.path === currentPath)) router.replace(docsPath(projectId));
  }, [state, repository, projectId, refresh, currentPath, router]);

  const pick = useCallback((parent: string) => {
    target.current = parent;
    input.current?.click();
  }, []);

  const element = (
    <>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={IMPORT_ACCEPT}
        data-testid="doc-import-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void start(target.current, files);
        }}
      />
      {state && <DocImportNotice projectId={projectId} state={state} onUndo={undo} onDismiss={() => setState(null)} />}
    </>
  );
  return { start, pick, element };
}
