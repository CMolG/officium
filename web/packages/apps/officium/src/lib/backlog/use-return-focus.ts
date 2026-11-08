"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import { DialogContent } from "@javadaba/ui";

/**
 * Captures whatever had focus the instant a dialog mounts (a `useState` initializer runs
 * synchronously during the first render, before Radix's `FocusScope` moves focus into the
 * dialog on mount) and returns an `onCloseAutoFocus` handler that restores it.
 *
 * JDB-224 item 3: Radix's own default only returns focus to a `<DialogTrigger>`, and these
 * dialogs are opened from state owned by `Board` (a card click, not a literal
 * `DialogTrigger`-wrapped element) -- without this, focus would drop to the document on close
 * instead of back to the card, button, or row that opened the dialog.
 */
export function useReturnFocus(): Pick<ComponentPropsWithoutRef<typeof DialogContent>, "onCloseAutoFocus"> {
  const [triggerElement] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  return {
    onCloseAutoFocus: (event) => {
      if (!triggerElement || !document.contains(triggerElement)) return;
      event.preventDefault();
      triggerElement.focus();
    },
  };
}
