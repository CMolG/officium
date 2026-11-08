import { createContext, useContext, type RefObject } from "react";
import type { View } from "react-native";

export interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<View | null>;
  /** Set by a `PopoverAnchor`; the layer anchors to it instead of the trigger. */
  anchorRef: RefObject<View | null>;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopover(): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) throw new Error("@javadaba/ui: a Popover part was rendered outside a <Popover>.");
  return context;
}
