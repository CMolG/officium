"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * A third of the height of the surface an absolutely placed element floats over (its offset parent),
 * or of the screen when it is pinned to it; undefined until measured (JAVA-1547). It follows resizes.
 *
 * Web half of a pair: Android has no such surface (`use-surface-third.native.ts`).
 */
export function useSurfaceThird(node: RefObject<HTMLElement | null>, active: boolean): number | undefined {
  const [third, setThird] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const element = node.current;
    if (!active || !element) return;
    const measure = () => setThird(Math.floor((element.offsetParent?.clientHeight ?? window.innerHeight) / 3));
    measure();
    const observer = new ResizeObserver(measure);
    if (element.offsetParent) observer.observe(element.offsetParent);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [node, active]);
  return third;
}
