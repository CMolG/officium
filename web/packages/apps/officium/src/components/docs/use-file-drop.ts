"use client";

import { useState, type DragEvent } from "react";

const carriesFiles = (e: DragEvent<HTMLElement>) => Array.from(e.dataTransfer.types).includes("Files");

/**
 * Files dragged over Documentation where nothing takes them (JAVA-801): the browser would open them in place of
 * the app, so the view refuses the drop and the files stay where they were. Where something inside took the
 * event first (a tree row, the page's editor taking an image, JAVA-798), its answer stands.
 */
export function refuseFileDrop(e: DragEvent<HTMLElement>): void {
  if (e.defaultPrevented || !carriesFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "none";
}

/**
 * A tree row that takes dropped files (JAVA-801): `over` while files hover it, so the row can say "Drop to add
 * pages here" in words, and `onFiles` with what was dropped. A drag of anything but files (a row being
 * reordered) passes through untouched.
 */
export function useFileDrop(enabled: boolean, onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  if (!enabled) return { over: false, handlers: {} };
  const handlers = {
    onDragOver(e: DragEvent<HTMLElement>) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setOver(true);
    },
    onDragLeave(e: DragEvent<HTMLElement>) {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
    },
    onDrop(e: DragEvent<HTMLElement>) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      onFiles(Array.from(e.dataTransfer.files));
    },
  };
  return { over, handlers };
}
