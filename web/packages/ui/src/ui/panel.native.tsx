import type { ReactNode } from "react";
import { Pressable, View, type ViewProps } from "react-native";

import { cn } from "../lib/cn";
import type { PanelAxes, PanelMaterial, PanelRadius } from "./panel.shared";

/*
 * Panel on Android. `plain` and `raised` are the web's hairline and surface; `glass` has no
 * `backdrop-filter` to blur what is behind it, so it is the translucent veil and edge alone (over
 * a flat page, use `plain`). An interactive panel is a `Pressable` with an `active:` press.
 */

export interface PanelProps extends PanelAxes, Omit<ViewProps, "children"> {
  /** Accepted so a web call site moves over; a panel is a `View`. */
  as?: unknown;
  onPress?: () => void;
  children?: ReactNode;
}

const RADII: Record<PanelRadius, string> = {
  sm: "rounded-[var(--radius-jd-sm)]",
  md: "rounded-[var(--radius-jd-md)]",
  lg: "rounded-[var(--radius-jd-lg)]",
  xl: "rounded-[var(--radius-jd-xl)]",
  bento: "rounded-[var(--radius-jd-bento-m)]",
};

const MATERIALS: Record<PanelMaterial, string> = {
  plain: "bg-[color:var(--jd-card)]",
  glass: "border border-[color:var(--jd-glass-border)] bg-[color:var(--jd-glass-bg)] border-t-[color:var(--jd-ink)]/[0.14]",
  raised: "border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)]",
};

export function Panel({ material = "plain", radius = "md", interactive = false, as: _as, className, children, onPress, ...rest }: PanelProps) {
  const classes = cn(RADII[radius], MATERIALS[material], interactive && "active:opacity-80", className);
  if (interactive) {
    return (
      <Pressable role="button" onPress={onPress} className={classes} {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View className={classes} {...rest}>
      {children}
    </View>
  );
}
