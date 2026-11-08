import { View } from "react-native";

import { cn } from "../lib/cn";
import { SKELETON_RADIUS, type SkeletonAxes } from "./skeleton.shared";

/*
 * Skeleton on Android: the same bone, static. `pulse` is accepted and ignored: a loop would need
 * Reanimated, and no Android surface asks for it yet.
 */

export interface SkeletonProps extends SkeletonAxes {}

export function Skeleton({ shape = "line", className }: SkeletonProps) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      className={cn("bg-[color:var(--jd-bone)]", SKELETON_RADIUS[shape], shape === "line" && "h-3 w-full", className)}
    />
  );
}
