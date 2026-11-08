"use client";

import { useMemo, useState, type RefObject } from "react";
import type { ViewportSpec } from "../types";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

export function useFitViewport(
  ref: RefObject<HTMLElement | null>,
  spec: ViewportSpec,
  minScale: number,
) {
  const list = useMemo(
    () => (spec == null ? [] : Array.isArray(spec) ? spec : [spec]),
    [spec],
  );
  const [width, setWidth] = useState<number | null>(null);
  const enabled = list.length > 0;

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, enabled]);

  if (!enabled) return { viewport: null, scale: null };
  let viewport = list[0];
  if (width != null)
    viewport =
      list.find((v) => width / v.width >= minScale) ?? list[list.length - 1];
  return { viewport, scale: width == null ? null : width / viewport.width };
}
