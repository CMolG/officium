import { Pressable, View } from "react-native";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import type { SwitchState } from "./toggle.shared";

/*
 * Switch on Android: a `Pressable` with the `switch` role, `aria-checked` for TalkBack, and the
 * web's track and thumb (the thumb sits at the end when on). The hit area is padded to 44 dp
 * around the 36x20 track with `hitSlop`; the look does not grow.
 */

export type SwitchProps = SwitchState & { "aria-label"?: string; id?: string };

export function Switch({ checked, defaultChecked = false, onCheckedChange, disabled, className, id, ...rest }: SwitchProps) {
  const [on, setOn] = useControllable(checked, defaultChecked, onCheckedChange);
  return (
    <Pressable
      role="switch"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      nativeID={id}
      hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
      onPress={() => setOn(!on)}
      className={cn(
        "flex h-5 w-9 shrink-0 flex-row items-center rounded-full border-2 border-transparent px-px",
        on ? "bg-[color:var(--jd-ink)]" : "bg-[color:var(--jd-control-border)]",
        disabled && "opacity-50",
        className,
      )}
      {...rest}
    >
      <View className={cn("h-4 w-4 rounded-full bg-[color:var(--jd-raised)]", on && "ml-auto")} />
    </Pressable>
  );
}
