import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { cn } from "../lib/cn";
import { LOADING_DELAY_MS, useStandInShown, type LoadingRegionAxes } from "./loading-region.shared";

/*
 * LoadingRegion on Android: the same contract without the fade (opacity jumps). The status is an
 * accessibility label on a view that exists only once the stand-in is shown.
 */

export interface LoadingRegionProps extends LoadingRegionAxes {
  fallback?: ReactNode;
  children?: ReactNode;
}

export function LoadingRegion({
  label,
  loading,
  delayMs = LOADING_DELAY_MS,
  showLabel = false,
  fallback,
  children,
  className,
}: LoadingRegionProps) {
  const shown = useStandInShown(loading, delayMs);
  return (
    <View className={cn(className)} aria-busy={loading || undefined}>
      {loading ? (
        <>
          <View className="h-full" style={{ opacity: shown ? 1 : 0 }}>{fallback}</View>
          {shown && label ? (
            <View role="status" aria-label={label}>
              {showLabel ? <Text className="text-sm text-[color:var(--jd-muted)]">{label}</Text> : null}
            </View>
          ) : null}
        </>
      ) : (
        children
      )}
    </View>
  );
}
