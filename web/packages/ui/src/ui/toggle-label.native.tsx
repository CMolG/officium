import { Children, isValidElement, type ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { cn } from "../lib/cn";

/** A toggle's children for this state: strings get the label ink, since ink does not inherit on Android. */
export function pressedChildren(children: ReactNode, on: boolean) {
  const ink = on ? "text-[color:var(--jd-page)]" : "text-[color:var(--jd-muted)]";
  return Children.map(children, (child) =>
    typeof child === "string" || typeof child === "number" ? (
      <NativeText className={cn("text-sm font-medium", ink)}>{child}</NativeText>
    ) : isValidElement(child) || child == null ? child : null,
  );
}
