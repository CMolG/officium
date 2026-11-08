import { useEffect, useState } from "react";

import { LAYER_DURATION } from "../motion/presets.shared";

/** How long a layer outlives `open` turning false: its exit, and a frame to spare. */
export const LAYER_UNMOUNT_MS = LAYER_DURATION.out + 40;

/**
 * Whether a layer must stay mounted: while it is open, and for the length of its exit after it
 * closes. On Android a native `Modal` that unmounts the moment `open` flips cuts the exit, which
 * only plays while the window is still there; on the web the element that plays it must exist too
 * (`Presence`). Shared by both halves, so the web and the Android layers keep the same clock.
 */
export function useLayerMounted(open: boolean): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), LAYER_UNMOUNT_MS);
    return () => clearTimeout(timer);
  }, [open]);
  return open || mounted;
}
