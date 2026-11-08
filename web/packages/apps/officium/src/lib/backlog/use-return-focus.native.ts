import type { ComponentPropsWithoutRef } from "react";
import type { DialogContent } from "@javadaba/ui";

/**
 * `useReturnFocus` on Android: nothing to restore. Handing focus back to the element that opened
 * a dialog is the web's job (a `document.activeElement` read before Radix moves focus); on
 * Android the dialog is a native modal, and TalkBack returns to what opened it on its own.
 */
export function useReturnFocus(): Pick<ComponentPropsWithoutRef<typeof DialogContent>, "onCloseAutoFocus"> {
  return {};
}
