"use client";

import { useShortcuts } from "@javadaba/ui/hooks";

import { DOC_SHORTCUTS } from "../../lib/docs/doc-shortcuts";

/**
 * The documentation's app shortcuts (JAVA-799). They stay out of the way of typing: `useShortcuts` skips a key
 * that goes to a field, the editor or an open dialog, so `?` and Mod+K are only ever text in the title and the
 * page. The command menu closes itself on Mod+K from inside its own box.
 */
export function useDocShortcuts({ onMenu, onSidebar, onHelp }: { onMenu: () => void; onSidebar: () => void; onHelp: () => void }): void {
  useShortcuts([
    { combo: DOC_SHORTCUTS.menu, run: onMenu },
    { combo: DOC_SHORTCUTS.sidebar, run: onSidebar },
    { combo: DOC_SHORTCUTS.help, run: onHelp },
  ]);
}
