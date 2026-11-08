import type { ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";
import { useTabs } from "./tabs-context.native";

export function TabsContent({ value, className, children }: { value: string; className?: string; children?: ReactNode }) {
  const tabs = useTabs();
  if (tabs.value !== value) return null;
  return (
    <View role="tabpanel" className={cn("mt-2", className)}>
      {children}
    </View>
  );
}
