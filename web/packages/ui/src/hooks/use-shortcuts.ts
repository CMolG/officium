"use client";

import { useEffect, useRef } from "react";

import { isTypingTarget, matchesCombo } from "../lib/shortcuts";

export interface Shortcut {
  /** `Mod+K`, `Mod+.`, `?`, `Ctrl+Alt+H` (see `lib/shortcuts.ts`). */
  combo: string;
  /** Skips the key while the shortcut can't be used, so the browser keeps it. */
  enabled?: boolean;
  /**
   * The key fires even inside a field or a dialog. Reserved for a toggle that must also close
   * what it opened (Mod+K closing the command menu); every other shortcut stays out of the way.
   */
  whileTyping?: boolean;
  run: (event: KeyboardEvent) => void;
}

/**
 * Registers app shortcuts on the page. None fires while a key goes to an input, textarea,
 * select, contenteditable or open dialog, on a key repeat, or with AltGraph held (a layout's
 * way to type `@` or `€`, not a chord). The handler that matches calls `preventDefault`, so a
 * browser's own binding (Ctrl+K in the address bar) does not also fire.
 *
 * Web half of a pair: Android has no keyboard shortcuts to register (`use-shortcuts.native.ts`).
 */
export function useShortcuts(shortcuts: readonly Shortcut[]): void {
  const latest = useRef(shortcuts);
  useEffect(() => {
    latest.current = shortcuts;
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || event.getModifierState("AltGraph")) return;
      const typing = isTypingTarget(event.target);
      for (const shortcut of latest.current) {
        if (shortcut.enabled === false) continue;
        if (typing && !shortcut.whileTyping) continue;
        if (!matchesCombo(event, shortcut.combo)) continue;
        event.preventDefault();
        shortcut.run(event);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
