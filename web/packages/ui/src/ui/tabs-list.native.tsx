import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";

export function TabsList({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <View
      role="tablist"
      className={cn(
        "flex flex-row items-center justify-center self-start rounded-lg bg-[color:var(--jd-ink)]/[0.05] p-1",
        className,
      )}
    >
      {children}
    </View>
  );
}
