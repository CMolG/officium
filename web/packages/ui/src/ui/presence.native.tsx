import type { ReactNode } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { useLayerMounted } from "../lib/use-layer-mounted";
import { layerMotion } from "../motion/presets.native";
import type { LayerKind } from "../motion/presets.shared";

/** The same kinds as the web `Presence`, which has no `slide-left` keyframe to match. */
export type PresenceKind = Exclude<LayerKind, "slide-left">;

/**
 * The Android twin of `Presence`, with the same props and the same clock. `layerMotion` plays the
 * kind; the travel is the window's height for a sheet and its width otherwise, since a layer leaves
 * by its own edge. A closing layer stays mounted until its exit has run.
 */
export function Presence({
  open,
  kind,
  delay = 0,
  style,
  children,
}: {
  open: boolean;
  kind: PresenceKind;
  /** Milliseconds before the entrance starts, for a stagger. */
  delay?: number;
  style?: ViewStyle;
  children?: ReactNode;
}) {
  const mounted = useLayerMounted(open);
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  if (!mounted) return null;
  const travel = kind === "sheet" ? height : width;
  return (
    <Animated.View
      style={style}
      entering={layerMotion(kind, "in", reduced, travel).delay(delay)}
      exiting={layerMotion(kind, "out", reduced, travel)}
    >
      {children}
    </Animated.View>
  );
}
