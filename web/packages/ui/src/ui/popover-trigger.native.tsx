import { Slot } from "@radix-ui/react-slot";
import type { ElementType, ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";

import { composePress } from "../lib/compose-press";
import { usePopover } from "./popover-context.native";

/** Toggles the popover. `asChild` keeps the child's skin (a `Button`), as on the web. */
export function PopoverTrigger({
  asChild = false,
  children,
  onPress,
  ...rest
}: Omit<PressableProps, "children" | "role"> & { asChild?: boolean; children?: ReactNode; className?: string }) {
  const { open, setOpen, triggerRef } = usePopover();
  const Comp: ElementType = asChild ? Slot : Pressable;
  return (
    <Comp ref={triggerRef} role="button" aria-expanded={open} aria-haspopup="dialog" {...rest} onPress={composePress(() => setOpen(!open), onPress as never)}>
      {children}
    </Comp>
  );
}
