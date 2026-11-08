import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";

/** Plain text children need a `Text`; the web's `text-sm` ink does not inherit on Android. */
export function PopoverBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <View className={cn("px-4 py-3", className)}>{children}</View>;
}
