import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, Text as NativeText } from "react-native";

import { cn } from "../lib/cn";
import { useTabs } from "./tabs-context.native";

export function TabsTrigger({
  value,
  disabled,
  className,
  children,
  ...rest
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  const tabs = useTabs();
  const active = tabs.value === value;
  return (
    <Pressable
      role="tab"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onPress={() => tabs.select(value)}
      className={cn(
        "flex min-h-11 flex-row items-center justify-center rounded-md px-3 py-1 active:opacity-80",
        active && "bg-[color:var(--jd-raised)]",
        disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      {Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <NativeText
            className={cn("text-sm font-medium", active ? "text-[color:var(--jd-ink)]" : "text-[color:var(--jd-muted)]")}
          >
            {child}
          </NativeText>
        ) : isValidElement(child) || child == null ? child : null,
      )}
    </Pressable>
  );
}
