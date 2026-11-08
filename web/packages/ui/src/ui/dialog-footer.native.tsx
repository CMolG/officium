import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";

/** The dialog's actions, stacked full width with the primary (the LAST child) on top, at the bottom of a short sheet. */
export function DialogFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return <View className={cn("mt-auto flex flex-col-reverse gap-2", className)}>{children}</View>;
}
