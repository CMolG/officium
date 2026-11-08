import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { cn } from "../lib/cn";

export function PopoverTitle({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <NativeText
      role="heading"
      aria-level={2}
      className={cn("font-[family-name:var(--font-jd-kicker)] text-xs uppercase leading-none tracking-[0.26em] text-[color:var(--jd-muted)]", className)}
    >
      {children}
    </NativeText>
  );
}
