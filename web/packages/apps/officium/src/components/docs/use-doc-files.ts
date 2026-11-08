"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import type { PageEditorHandle } from "@javadaba/rich-text";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { captionOf, formatBytes, refusalWords, savingWords, storedName } from "../../lib/docs/doc-files";

export interface FileNotice {
  id: number;
  tone: "busy" | "done" | "error";
  text: string;
  /** Storage is full: the notice links to what takes the space. */
  full?: boolean;
}

/**
 * Adding files to the page being edited (JAVA-798): pasted, dropped, picked from `/image`, `/file` or
 * the Attach button. Each file is uploaded on its own and its reference goes into the page only once
 * the server has it, so a save never carries a half-uploaded image. What happened is said in notices.
 */
export function useDocFiles({
  projectId, path, repository, editor,
}: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  editor: RefObject<PageEditorHandle | null>;
}) {
  const [notices, setNotices] = useState<FileNotice[]>([]);
  const next = useRef(1);

  const show = useCallback((notice: Omit<FileNotice, "id">, replace?: number): number => {
    const id = replace ?? next.current++;
    setNotices((list) => (replace ? list.map((n) => (n.id === id ? { ...notice, id } : n)) : [...list, { ...notice, id }]));
    return id;
  }, []);

  const addOne = useCallback(
    async (file: File) => {
      const id = show({ tone: "busy", text: `Uploading and optimizing ${file.name || "the file"} (${formatBytes(file.size)})…` });
      const put = async () => {
        const taken = new Set((await repository.listDocFiles(projectId, path)).map((f) => f.name));
        return repository.uploadDocFile(projectId, path, storedName(file, taken, Date.now()), file);
      };
      try {
        // A busy server or a name taken meanwhile is worth one more try before the words.
        const stored = await put().catch((error: unknown) => {
          if (error instanceof ApiError && (error.code === "image_busy" || error.code === "attachment_exists")) return put();
          throw error;
        });
        editor.current?.insertMarkdown(
          stored.kind === "image" ? `![${captionOf(stored.name)}](${stored.uri})` : `[${stored.name}](${stored.uri})`,
        );
        show({ tone: "done", text: savingWords(stored) }, id);
      } catch (error) {
        const words = refusalWords(error, file.name || "The file");
        show({ tone: "error", text: words.text, full: words.full }, id);
      }
    },
    [projectId, path, repository, editor, show],
  );

  const upload = useCallback(
    async (files: readonly File[]) => {
      for (const file of files) await addOne(file);
    },
    [addOne],
  );

  const dismiss = useCallback((id: number) => setNotices((list) => list.filter((n) => n.id !== id)), []);

  return { notices, upload, dismiss };
}
