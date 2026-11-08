"use client";

import * as React from "react";
import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";

import { toastStore } from "./toast";
import type { ToastItem } from "./toast-store";

/**
 * The holds that stop every toast clock at once, kept honest (JAVA-1620):
 *
 * - A hidden tab stops the clocks too: nothing expires for someone who is not looking (WCAG 2.2.1).
 * - Unmounting while a hold is on must not leave the clocks stopped for whatever mounts next.
 * - A toast removed under the focus fires no blur (Chrome sends none for a node it drops), so its focus hold
 *   would outlive it and no toast would expire again. Once a toast leaves, the hold is released when focus is
 *   no longer on the stack (`onReleased` tells the stack, which also drops its "focused" look).
 */
export function useToastHolds(root: React.RefObject<HTMLElement | null>, visible: ToastItem[], onReleased: () => void) {
  React.useEffect(() => {
    toastStore.pause("hidden", isHidden());
    const stop = onVisibilityChange((hidden) => toastStore.pause("hidden", hidden));
    return () => {
      stop();
      toastStore.pause("hidden", false);
      toastStore.pause("pointer", false);
      toastStore.pause("focus", false);
    };
  }, []);

  React.useEffect(() => {
    const stack = root.current;
    if (stack?.contains(stack.ownerDocument.activeElement)) return;
    toastStore.pause("focus", false);
    onReleased();
  }, [root, visible, onReleased]);
}
