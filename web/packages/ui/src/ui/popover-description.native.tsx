import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { cn } from "../lib/cn";

export function PopoverDescription({ className, children }: { className?: string; children?: ReactNode }) {
  return <NativeText className={cn("text-sm leading-relaxed text-[color:var(--jd-muted)]", className)}>{children}</NativeText>;
}
