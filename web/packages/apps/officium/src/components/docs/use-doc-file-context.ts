"use client";

import { useEffect, useMemo, useState } from "react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocFile } from "../../lib/backlog/types";
import { fileResolver, type DocFileContext } from "../../lib/docs/doc-files";

const NONE: ReadonlyMap<string, DocFile> = new Map();

/**
 * What a page's text needs to show its files (JAVA-798): where each image is read from, and the type
 * and size of each file for its chip. The list is read only for a page that points at a file, and again
 * whenever the page changes.
 */
export function useDocFileContext(
  repository: BacklogRepository, projectId: string, path: string, version: number, body: string,
): DocFileContext {
  const resolve = useMemo(() => fileResolver((page, name) => repository.docFileUrl(projectId, page, name)), [repository, projectId]);
  const [info, setInfo] = useState<ReadonlyMap<string, DocFile>>(NONE);
  const hasFiles = body.includes("/_files/");

  useEffect(() => {
    if (!hasFiles) return;
    let cancelled = false;
    repository.listDocFiles(projectId, path).then(
      (files) => !cancelled && setInfo(new Map(files.map((file) => [file.uri, file]))),
      () => !cancelled && setInfo(NONE),
    );
    return () => {
      cancelled = true;
    };
  }, [repository, projectId, path, version, hasFiles]);

  return useMemo(() => ({ resolve, info: hasFiles ? info : NONE }), [resolve, info, hasFiles]);
}
