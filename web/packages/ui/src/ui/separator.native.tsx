import { View } from "react-native";

import { cn } from "../lib/cn";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  /** Pure decoration (default): hidden from TalkBack. */
  decorative?: boolean;
  className?: string;
}

/** Separator on Android: a hairline `View`. A meaningful one (`decorative={false}`) is a `separator` role. */
export function Separator({ orientation = "horizontal", decorative = true, className }: SeparatorProps) {
  return (
    <View
      role={decorative ? "none" : "separator"}
      aria-hidden={decorative || undefined}
      className={cn(
        "shrink-0 bg-[color:var(--jd-line)]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
