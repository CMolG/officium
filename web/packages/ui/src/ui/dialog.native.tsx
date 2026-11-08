import { useMemo, useRef } from "react";
import type { Text, View } from "react-native";

import { useControllable } from "../lib/use-controllable";
import { DialogContext } from "./dialog-context.native";
import type { DialogRootProps } from "./dialog.shared";

/*
 * Dialog on Android (JAVA-1486): the web's compound API over a native `Modal` in the phone shape
 * the web has below `sm` (JAVA-59): full screen, rising from the bottom. The root holds `open`
 * (controlled or not, as Radix does), the title and trigger refs for TalkBack's focus, and draws
 * nothing; the parts are `dialog-*.native.tsx`. System Back closes it through the Modal's
 * `onRequestClose`, so `useBackDismisses` has nothing to hold here.
 *
 * A `ScrollView` that renders a Dialog sets `keyboardShouldPersistTaps="handled"` (`ScrollArea`
 * does): React Native's responder walk follows React's tree across the `Modal`, so a scroll view
 * left at its default takes the first press on a dialog button to hide the keyboard (JAVA-1486).
 */

export function Dialog({ open, defaultOpen = false, onOpenChange, children }: DialogRootProps) {
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const titleRef = useRef<Text>(null);
  const triggerRef = useRef<View>(null);
  const value = useMemo(() => ({ open: isOpen, setOpen, titleRef, triggerRef }), [isOpen, setOpen]);
  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

export { DialogClose } from "./dialog-close.native";
export { DialogContent } from "./dialog-content.native";
export { DialogDescription } from "./dialog-description.native";
export { DialogFooter } from "./dialog-footer.native";
export { DialogHeader } from "./dialog-header.native";
export { DialogOverlay } from "./dialog-overlay.native";
export { DialogPortal } from "./dialog-portal.native";
export { DialogTitle } from "./dialog-title.native";
export { DialogTrigger } from "./dialog-trigger.native";
