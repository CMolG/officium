import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";

export function PopoverFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <View className={cn("flex flex-row items-center justify-end gap-2 border-t border-[color:var(--jd-line)] px-4 py-3", className)}>
      {children}
    </View>
  );
}
