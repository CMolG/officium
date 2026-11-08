"use client";

// card://JAVA-1385 [temporary]: moved from Board, which React Compiler skips
"use no memo";

import { useEffect } from "react";

/** The board's editors: the card modal and the new-card dialog carry the rich-text editor. */
const prefetchBoardEditors = () => {
  void import("../TaskModal");
  void import("../CreateCardDialog");
};

/**
 * Loads an editor's chunks once the screen is idle AND its first read has answered (`ready`), so
 * the rich-text editor never competes with the screen's own first paint (JAVA-1647). Defaults to
 * the board's editors; the Backlog passes its own. `prefetch` must be a stable reference.
 */
export function useIdlePrefetch(ready: boolean, prefetch: () => void = prefetchBoardEditors) {
  // The editors are not needed to paint the screen: they load on their own, and are fetched once
  // it is idle so the first card opens without a wait.
  useEffect(() => {
    if (!ready) return;
    // A global, not `window.`'s: React Native has it too. Safari still does not.
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetch, 1500);
    return () => clearTimeout(timer);
  }, [ready, prefetch]);
}
