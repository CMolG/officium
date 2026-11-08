"use client";

import { useSyncExternalStore } from "react";
import { isApplePlatform } from "@javadaba/sdk/platform";

import { shortcutKeys } from "../lib/shortcuts";

const subscribe = () => () => {};

/**
 * A combo as one short string in the keys this keyboard has ("⌘L", "Ctrl+L"), for the places that print a
 * shortcut as plain text (a tooltip, a menu row) where `ShortcutKeys`' keycaps would be too much. Server and
 * first browser render agree (Control); an Apple platform swaps to its symbols right after hydration.
 */
export function useShortcutLabel(combo: string | undefined): string {
  const apple = useSyncExternalStore(subscribe, isApplePlatform, () => false);
  if (!combo) return "";
  const caps = shortcutKeys(combo, apple);
  return apple ? caps.join("") : caps.join("+");
}
