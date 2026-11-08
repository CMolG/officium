/**
 * `useVisualPerformance` on Android: the same answer, from what Android can tell.
 *
 * The web half probes WebGL's renderer and `navigator.deviceMemory`; neither exists here, and a
 * device-class library is not declared (`PREFERRED_TECHNOLOGIES.csv`), so the hardware fields
 * stay `undefined` and the mode follows the accessibility setting alone — the one input that
 * is a person's explicit request.
 *
 * Not type-checked by `packages/ui`'s `tsc` yet (JAVA-99 brings `react-native`).
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export type VisualPerformanceMode = "high" | "low";

export interface VisualPerformanceInfo {
  mode: VisualPerformanceMode;
  prefersReducedMotion: boolean;
  isLowEndDevice: boolean;
  isSoftwareRendering: boolean;
  deviceMemory: number | undefined;
  hardwareConcurrency: number | undefined;
  gpuRenderer: string | undefined;
}

const infoFor = (prefersReducedMotion: boolean): VisualPerformanceInfo => ({
  mode: prefersReducedMotion ? "low" : "high",
  prefersReducedMotion,
  isLowEndDevice: false,
  isSoftwareRendering: false,
  deviceMemory: undefined,
  hardwareConcurrency: undefined,
  gpuRenderer: undefined,
});

export function useVisualPerformance(): VisualPerformanceInfo {
  const [info, setInfo] = useState<VisualPerformanceInfo>(() => infoFor(false));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => setInfo(infoFor(reduced)));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) =>
      setInfo(infoFor(reduced)),
    );
    return () => subscription.remove();
  }, []);

  return info;
}
