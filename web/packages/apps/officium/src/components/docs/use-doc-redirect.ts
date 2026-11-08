"use client";

import { useEffect, useRef, useState } from "react";

import type { DocPage } from "../../lib/backlog/types";
import { forgetMovedFrom, peekMovedFrom, rememberMovedFrom } from "../../lib/docs/moved-from";

/**
 * A page reached through an old path (a move, here or elsewhere) replaces the address with its own, and
 * remembers the old one so the new address can say "Moved from …" (JAVA-792). While `holding` (the page is
 * being edited or renamed) the address stays: the save lands through the redirect and the address follows once
 * the person is done. Returns the old path this view was opened through, if it was.
 */
export function useDocRedirect(path: string, page: DocPage | null, holding: boolean, onMoved: (path: string) => void): string | null {
  const [movedFrom] = useState(() => peekMovedFrom(path));
  // The latest callback, read when the page moves: a caller's inline function must not re-run the effect.
  const moved = useRef(onMoved);
  useEffect(() => {
    moved.current = onMoved;
  }, [onMoved]);
  useEffect(forgetMovedFrom, []); // read once, in the first render
  useEffect(() => {
    // The page living elsewhere is the move, whether this read came through the redirect or a save already
    // answered from the new path: the address it was opened at is where it moved from.
    if (page && page.path !== path && !holding) {
      rememberMovedFrom(page.path, page.redirectedFrom ?? path);
      moved.current(page.path);
    }
  }, [page, path, holding]);
  return movedFrom;
}
