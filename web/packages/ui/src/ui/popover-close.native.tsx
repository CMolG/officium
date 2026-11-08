import { Slot } from "@radix-ui/react-slot";
import type { ElementType, ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";

import { composePress } from "../lib/compose-press";
import { usePopover } from "./popover-context.native";

/** Closes the popover. `asChild` keeps the child's skin and runs its own `onPress` first. */
export function PopoverClose({
  asChild = false,
  children,
  onPress,
  ...rest
}: Omit<PressableProps, "children" | "role"> & { asChild?: boolean; children?: ReactNode; className?: string }) {
  const { setOpen } = usePopover();
  const Comp: ElementType = asChild ? Slot : Pressable;
  return (
    <Comp role="button" {...rest} onPress={composePress(() => setOpen(false), onPress as never)}>
      {children}
    </Comp>
  );
}
