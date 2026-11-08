"use client";

/*
 * useVisualPerformance — can this device handle effects?
 *
 * Promoted from `javadaba-landing/src/hooks/use-visual-performance.ts` on 2026-08-13,
 * while wiring up Curriculum's motion gate (ficha C of JDB-019). It used to live ONLY
 * in the landing, which made it unreachable for any miniapp: an app can't import from
 * another app (`topology.py verify` checks this), so the only way out was to copy
 * it — which is exactly the kind of duplication this design system exists to prevent.
 *
 * Its home is `@javadaba/ui` because the question it answers is about surface, not
 * content: the same answer holds for a landing doodle and for the cognitive test's
 * transitions.
 *
 * The contract is `mode`, and it's consumed in ONE way: it's stamped as
 * `data-capability` on an ancestor and expensive rules turn off with
 * `[data-capability="low"]`. In CSS, not in JS, so turning them off doesn't cost a
 * render.
 *
 * The answer is computed once per page, not once per consumer: one module-level store
 * holds it, and every consumer reads that store through `useSyncExternalStore`. The GPU
 * probe (a WebGL context) runs once, even when a board mounts a card per row. The cheap
 * inputs are re-read whenever a consumer subscribes, so `JAVADABA_VISUAL_MODE` written
 * at runtime (DitherField's FPS guard) reaches the next consumer that mounts, and the
 * ones already mounted are told about it; a reduced-motion change is pushed by the media
 * query to every consumer.
 *
 * `JAVADABA_VISUAL_MODE` in `localStorage` forces the mode by hand — it's the way to
 * debug the `low` state on a machine that isn't actually low-end.
 */

import { useSyncExternalStore } from "react";

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

const initialInfo: VisualPerformanceInfo = {
  mode: "high",
  prefersReducedMotion: false,
  isLowEndDevice: false,
  isSoftwareRendering: false,
  deviceMemory: undefined,
  hardwareConcurrency: undefined,
  gpuRenderer: undefined,
};

// One store per page. A `const` object mutated by plain functions: a reassigned module
// `let` read inside a hook is reordered by the React Compiler.
const store = {
  snapshot: initialInfo,
  gpu: { probed: false, renderer: undefined as string | undefined },
  listeners: new Set<() => void>(),
  query: null as MediaQueryList | null,
};

function getGpuRenderer() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return undefined;

    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return undefined;

    return (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return undefined;
  }
}

function readManualMode(): VisualPerformanceMode | null {
  try {
    const stored = localStorage.getItem("JAVADABA_VISUAL_MODE");
    if (stored === "high" || stored === "low") return stored;
  } catch {
    return null;
  }
  return null;
}

function computeSnapshot(): VisualPerformanceInfo {
  // A failed probe counts as probed: a device whose context is null or throws must not
  // be probed again by every consumer.
  if (!store.gpu.probed) store.gpu = { probed: true, renderer: getGpuRenderer() };

  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory;
  const hardwareConcurrency = nav.hardwareConcurrency;
  const gpuRenderer = store.gpu.renderer;
  const prefersReducedMotion = store.query?.matches ?? false;
  const isSoftwareRendering = /SwiftShader|llvmpipe|Software|Basic Render Driver|VMware/i.test(
    gpuRenderer ?? "",
  );
  const isLowEndDevice =
    (typeof deviceMemory === "number" && deviceMemory < 4) ||
    (typeof hardwareConcurrency === "number" && hardwareConcurrency < 4);

  const shouldReduce = prefersReducedMotion || isLowEndDevice || isSoftwareRendering;

  return {
    mode: readManualMode() ?? (shouldReduce ? "low" : "high"),
    prefersReducedMotion,
    isLowEndDevice,
    isSoftwareRendering,
    deviceMemory,
    hardwareConcurrency,
    gpuRenderer,
  };
}

function sameInfo(a: VisualPerformanceInfo, b: VisualPerformanceInfo) {
  return (Object.keys(a) as (keyof VisualPerformanceInfo)[]).every((key) => a[key] === b[key]);
}

// Recomputes the answer and tells the consumers only when a field really changed.
function refresh() {
  const next = computeSnapshot();
  if (sameInfo(next, store.snapshot)) return;
  store.snapshot = next;
  store.listeners.forEach((listener) => listener());
}

function handleMediaChange() {
  refresh();
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  store.query ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  refresh();
  if (store.listeners.size === 0) store.query.addEventListener("change", handleMediaChange);
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) store.query?.removeEventListener("change", handleMediaChange);
  };
}

function getSnapshot() {
  return store.snapshot;
}

function getServerSnapshot() {
  return initialInfo;
}

export function useVisualPerformance(): VisualPerformanceInfo {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
