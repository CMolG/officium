import { useRef } from "react";
import { focusedElement } from "@javadaba/sdk/platform";

/**
 * Gives focus back to what had it when a dialog opened. Radix returns focus only to a `DialogTrigger`, and a
 * command menu or a sheet is opened by a shortcut or by state, so without this focus would drop to the page
 * on close. Spread the result onto `DialogContent`.
 */
export function useRestoreFocus() {
  const origin = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      origin.current = focusedElement();
    },
    onCloseAutoFocus: (event: Event) => {
      if (!origin.current?.isConnected) return;
      event.preventDefault();
      origin.current.focus();
    },
  };
}
