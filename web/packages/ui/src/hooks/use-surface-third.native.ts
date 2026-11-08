import type { RefObject } from "react";

/** Android has no floating tray surface to measure (`FloatingTray` is `notOnAndroid`); nothing is capped. */
export function useSurfaceThird(_node: RefObject<unknown>, _active: boolean): number | undefined {
  return undefined;
}
