import type { RefObject } from "react";
import { AccessibilityInfo, type HostInstance } from "react-native";

/**
 * Moves TalkBack's focus to the view behind `ref` (JAVA-1486): a layer's title when it opens, the
 * trigger when it closes. The delay lets the native view mount (or the layer's window go) before
 * the request, which is dropped when it arrives first.
 *
 * Measured on the emulator: `setAccessibilityFocus(tag)` takes the old architecture's path and does
 * nothing under Fabric, and a `focus` event is spoken but moves no focus from a view without input
 * focus. A hover-enter is what TalkBack follows, as it does a finger exploring the screen.
 */
export function focusNode(ref: RefObject<unknown>, delayMs = 120): () => void {
  const timer = setTimeout(() => {
    if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current as HostInstance, "viewHoverEnter");
  }, delayMs);
  return () => clearTimeout(timer);
}
