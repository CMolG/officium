import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { cn } from "../lib/cn";
import { toggleVariants } from "./toggle.native";
import { useToggleGroup } from "./toggle-group-context.native";
import { pressedChildren } from "./toggle-label.native";
import type { ToggleAxes } from "./toggle.shared";

export function ToggleGroupItem({
  value,
  variant,
  size,
  className,
  children,
  disabled,
  ...rest
}: ToggleAxes & { value: string; children?: ReactNode; disabled?: boolean; "aria-label"?: string }) {
  const group = useToggleGroup();
  const on = group.selected.includes(value);
  return (
    <Pressable
      role="button"
      aria-selected={on}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onPress={() => group.toggle(value)}
      className={cn(
        toggleVariants({ variant: group.variant || variant, size: group.size || size }),
        on && "bg-[color:var(--jd-ink)] border-[color:var(--jd-ink)]",
        disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      {pressedChildren(children, on)}
    </Pressable>
  );
}
