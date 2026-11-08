import { Slot } from "@radix-ui/react-slot";
import type { ElementType, ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";

import { composePress } from "../lib/compose-press";
import { useDialog } from "./dialog-context.native";

/** Opens the dialog. `asChild` keeps the child's skin (a `Button`), as on the web. */
export function DialogTrigger({
  asChild = false,
  children,
  onPress,
  ...rest
}: Omit<PressableProps, "children" | "role"> & { asChild?: boolean; children?: ReactNode; className?: string }) {
  const { setOpen, triggerRef } = useDialog();
  const Comp: ElementType = asChild ? Slot : Pressable;
  return (
    <Comp ref={triggerRef} role="button" aria-haspopup="dialog" {...rest} onPress={composePress(() => setOpen(true), onPress as never)}>
      {children}
    </Comp>
  );
}
