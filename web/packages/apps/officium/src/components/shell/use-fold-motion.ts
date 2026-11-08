"use client";

import { useEffect, useRef, useState } from "react";
import { LAYOUT_DURATION } from "@javadaba/ui/motion";
import { useVisualPerformance } from "@javadaba/ui/hooks";
import { withViewTransition } from "@javadaba/ui/view-transition";

/**
 * The sidebar's fold as it is drawn. The fold is applied inside a view transition (JAVA-1535's review): the frame and
 * the page beside it move as one piece, the panel closing like a drawer while the page slides into the room it
 * leaves, instead of the width jumping in one frame and only the panel's text fading. The motion lives in
 * `theme-tokens.css` (`officium-docs-sidebar` / `officium-docs-main`); `withViewTransition` skips it under reduced
 * motion and where the browser has no view transitions. A fold read from storage while the page loads snaps into
 * place: nobody asked for it to move.
 *
 * Folding waits one beat (`LEAD`) so the fold button's own motion (`SidebarCollapseToggle`) is seen first: the label
 * is absorbed into the icon while it still has room. Unfolding does not wait: the room opens and the button follows.
 * A click back inside the beat cancels the fold.
 */
const LEAD = LAYOUT_DURATION + 40;

export function useFoldMotion(collapsed: boolean): boolean {
  const [shown, setShown] = useState(collapsed);
  const ready = useRef(false);
  const low = useVisualPerformance().mode === "low";

  useEffect(() => {
    // After the first frame the stored fold has been read, so a change from here on is the person's.
    const frame = requestAnimationFrame(() => {
      ready.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (shown === collapsed) return;
    if (!ready.current || low) {
      queueMicrotask(() => setShown(collapsed));
      return;
    }
    const apply = () => withViewTransition(() => setShown(collapsed));
    if (!collapsed) {
      apply();
      return;
    }
    const lead = setTimeout(apply, LEAD);
    return () => clearTimeout(lead);
  }, [collapsed, shown, low]);

  return shown;
}
