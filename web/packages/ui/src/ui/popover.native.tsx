import { useMemo, useRef, type ReactNode } from "react";
import type { View } from "react-native";

import { useControllable } from "../lib/use-controllable";
import { PopoverContext } from "./popover-context.native";

/*
 * Popover on Android (JAVA-1486): the web's compound API, anchored to its trigger (or a
 * `PopoverAnchor`) as on the web, where it does not become a sheet on a phone either. The root
 * holds `open` (controlled or not) and the refs; the layer is `AnchoredLayer`, in `PopoverContent`.
 */

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accepted so a web call site moves over; a native `Modal` is always modal. */
  modal?: boolean;
  children?: ReactNode;
}

export function Popover({ open, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
  const triggerRef = useRef<View>(null);
  const anchorRef = useRef<View>(null);
  const value = useMemo(() => ({ open: isOpen, setOpen, triggerRef, anchorRef }), [isOpen, setOpen]);
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>;
}

export { PopoverAnchor } from "./popover-anchor.native";
export { PopoverBody } from "./popover-body.native";
export { PopoverClose } from "./popover-close.native";
export { PopoverContent, type PopoverContentProps } from "./popover-content.native";
export { PopoverDescription } from "./popover-description.native";
export { PopoverFooter } from "./popover-footer.native";
export { PopoverHeader } from "./popover-header.native";
export { PopoverTitle } from "./popover-title.native";
export { PopoverTrigger } from "./popover-trigger.native";
