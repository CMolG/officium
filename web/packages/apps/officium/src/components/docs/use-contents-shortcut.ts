import { useShortcuts } from "@javadaba/ui/hooks";

import { DOC_SHORTCUTS } from "../../lib/docs/doc-shortcuts";

/**
 * Ctrl+Alt+H runs `toggle` (JAVA-795): what the Contents button does at the current width. It joined the
 * shortcut registry in JAVA-799, so it obeys the same rules as the others: ignored while a key goes to a field,
 * the editor or a dialog, on key repeat, and while AltGraph is down (on some keyboards Ctrl+Alt IS AltGr, and
 * H is a letter being typed).
 */
export function useContentsShortcut(toggle: () => void): void {
  useShortcuts([{ combo: DOC_SHORTCUTS.contents, run: toggle }]);
}
