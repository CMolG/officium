"use client";

import { useSyncExternalStore } from "react";
import { isApplePlatform } from "@javadaba/sdk/platform";

import { shortcutKeys } from "../lib/shortcuts";
import { cn } from "../lib/cn";
import { Text } from "./text";

const subscribe = () => () => {};

/** How a keycap is read out: "Command K", not "⌘ K". */
const KEY_WORDS: Record<string, string> = {
  "⌘": "Command", "⌃": "Control", "⌥": "Option", "⇧": "Shift", "↵": "Enter", "⎋": "Escape",
};
const wordOf = (cap: string) => KEY_WORDS[cap] ?? cap;

export interface ShortcutKeysProps {
  /** An abstract combo: `Mod+K`, `?`, `Ctrl+Alt+H`. */
  combo: string;
  className?: string;
}

/**
 * A shortcut drawn as keycaps (Lib-Display `.kc`): 26 px caps with a lower edge, in the keys this
 * person's keyboard has, read out as words ("Command K"), and not drawn at all on a touch screen.
 * The server and the first browser render agree (Control), and an Apple platform swaps to its
 * symbols right after hydration: reading the platform at render would print "⌘" into a Windows
 * visitor's HTML.
 */
export function ShortcutKeys({ combo, className }: ShortcutKeysProps) {
  const apple = useSyncExternalStore(subscribe, isApplePlatform, () => false);
  return (
    <Text className={cn("inline-flex flex-row items-center gap-1", className)}>
      <Text className="sr-only">{shortcutKeys(combo, apple).map(wordOf).join(" ")}</Text>
      {shortcutKeys(combo, apple).map((cap, index) => (
        <Text
          key={`${cap}-${index}`}
          aria-hidden
          className="inline-flex pointer-coarse:hidden h-[26px] min-w-[26px] flex-row items-center justify-center rounded-[7px] bg-[color:var(--jd-raised)] px-[7px] text-xs font-bold text-[color:var(--jd-ink)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--jd-ink)_20%,transparent),inset_0_-2px_0_color-mix(in_oklab,var(--jd-ink)_12%,transparent)]"
        >
          {cap}
        </Text>
      ))}
    </Text>
  );
}
