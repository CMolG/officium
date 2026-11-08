import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";

export function DialogHeader({ className, children }: { className?: string; children?: ReactNode }) {
  return <View className={cn("flex flex-col gap-1.5", className)}>{children}</View>;
}
