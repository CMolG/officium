import { useEffect, useRef, type RefObject } from "react";

import { focusNode } from "./focus-node.native";
import { LAYER_UNMOUNT_MS } from "./use-layer-mounted";

/**
 * How long after the layer's window goes TalkBack's focus may be moved back. When a window is
 * removed Android re-homes accessibility focus itself, and a request that arrives first is
 * overridden: on the emulator, Back on a Popover left focus on whatever sat under it (JAVA-1486).
 */
const SETTLE_MS = 300;

/**
 * Returns TalkBack's focus to `trigger` when a layer closes, once its window is gone. The first
 * render is skipped, so a layer that mounts closed never steals focus.
 */
export function useFocusOnToggle(open: boolean, trigger: RefObject<unknown>) {
  const previous = useRef(open);
  useEffect(() => {
    if (previous.current === open) return;
    previous.current = open;
    return open ? undefined : focusNode(trigger, LAYER_UNMOUNT_MS + SETTLE_MS);
  }, [open, trigger]);
}
