"use client";

import { FileUp, ImagePlus } from "lucide-react";
import { useCallback, useMemo, useRef, type RefObject } from "react";
import type { BlockItem, PageEditorHandle } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { useDocFiles } from "./use-doc-files";

/** What a file picker offers: images only for `/image`, anything the page accepts for `/file`. */
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
export const ANY_ACCEPT = "";

function openPicker(input: HTMLInputElement | null, accept: string): void {
  if (!input) return;
  input.accept = accept;
  input.click();
}

/**
 * The `/image` and `/file` entries of the `/` menu: each opens the picker, and the block goes in once the upload is done.
 * Opening is a command that acts only when it really runs: the menu also calls `apply` in a dry run, to learn which items
 * fit where the caret is, and a dry run must not open a file dialog.
 */
function fileBlockItems(pick: (accept: string) => void): BlockItem[] {
  const opening = (accept: string) => (chain: Parameters<BlockItem["apply"]>[0]) =>
    chain.command(({ dispatch }) => {
      if (dispatch) pick(accept);
      return true;
    });
  return [
    { id: "image", label: "Image", keywords: ["picture", "photo", "screenshot", "upload"], icon: ImagePlus, apply: opening(IMAGE_ACCEPT) },
    { id: "file", label: "File", keywords: ["attachment", "upload", "pdf", "csv"], icon: FileUp, apply: opening(ANY_ACCEPT) },
  ];
}

/**
 * Every way into adding a file to the page being edited (JAVA-798): the `/` menu's items, the Attach button and the
 * picker they share, plus the upload itself and what it says (`useDocFiles`).
 */
export function useDocFilePicker(args: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  editor: RefObject<PageEditorHandle | null>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const files = useDocFiles(args);
  const pick = useCallback((accept: string) => openPicker(input.current, accept), []);
  const blockItems = useMemo(() => fileBlockItems(pick), [pick]);
  const attach = useCallback(() => pick(ANY_ACCEPT), [pick]);
  return { ...files, input, blockItems, attach };
}
