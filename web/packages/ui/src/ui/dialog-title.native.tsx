import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { cn } from "../lib/cn";
import { useDialog } from "./dialog-context.native";

/** The dialog's name: a heading, and where TalkBack's focus lands when the dialog opens. */
export function DialogTitle({ className, children }: { className?: string; children?: ReactNode }) {
  const { titleRef } = useDialog();
  return (
    <NativeText
      ref={titleRef}
      role="heading"
      aria-level={2}
      className={cn("text-lg font-semibold leading-tight tracking-tight text-[color:var(--jd-ink)]", className)}
    >
      {children}
    </NativeText>
  );
}
