import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import { pressedChildren } from "./toggle-label.native";
import type { ToggleAxes, TogglePressState } from "./toggle.shared";

/*
 * Toggle on Android: the two-state control that looks like a button. Pressed is the inverted ink
 * (background `--jd-ink`, text `--jd-page`) exactly as on the web. React Native has no `aria-pressed`,
 * so TalkBack gets the state as `aria-selected`.
 */

export const toggleVariants = cva(
  "flex flex-row items-center justify-center gap-2 rounded-[var(--radius-jd-sm)] min-h-11 min-w-11 active:opacity-80",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--jd-page)]",
        outline: "border border-[color:var(--jd-control-border)] bg-[color:var(--jd-page)]",
      },
      size: { default: "px-2.5", sm: "px-2", lg: "px-3" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ToggleProps = ToggleAxes & TogglePressState & { children?: ReactNode; "aria-label"?: string; id?: string };

export function Toggle({ pressed, defaultPressed = false, onPressedChange, disabled, variant, size, className, children, id, ...rest }: ToggleProps) {
  const [on, setOn] = useControllable(pressed, defaultPressed, onPressedChange);
  return (
    <Pressable
      role="button"
      aria-selected={on}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      nativeID={id}
      onPress={() => setOn(!on)}
      className={cn(
        toggleVariants({ variant, size }),
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
