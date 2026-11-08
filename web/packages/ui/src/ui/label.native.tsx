import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { cn } from "../lib/cn";

/** Label on Android: the field's name as a `<Text>`; wiring it to a field is the field's `aria-labelledby` (TalkBack ignores `aria-label` on a text field). */
export function Label({ className, children, id }: { className?: string; children?: ReactNode; id?: string; htmlFor?: string }) {
  return (
    <NativeText id={id} className={cn("text-sm font-medium leading-none text-[color:var(--jd-ink)]", className)}>
      {children}
    </NativeText>
  );
}
