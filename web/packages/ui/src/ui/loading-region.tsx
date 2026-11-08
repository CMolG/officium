"use client";

import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { LOADING_DELAY_MS, useStandInShown, type LoadingRegionAxes } from "./loading-region.shared";

/*
 * LoadingRegion: the box a load fills (JAVA-1576). ONE element is always rendered, so loading and
 * loaded share the same geometry. While loading, `fallback` (the bones, sized to the real content) is
 * mounted at once but invisible until the delay runs out, then fades in, and the region speaks its
 * label once as a status. When loading ends, `children` take its place and `aria-busy` is gone.
 */

export interface LoadingRegionProps extends LoadingRegionAxes {
  /** The stand-in: `Skeleton` bones sized to the content they wait for. */
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
  fallbackClassName = "h-full",
}: LoadingRegionProps) {
  const shown = useStandInShown(loading, delayMs);
  return (
    <div className={className} aria-busy={loading || undefined}>
      {loading ? (
        <>
          {/* The visible label leads the bones (Lib-Display § LoadingRegion): say what is loading first. */}
          {shown && label ? (
            <span role="status" className={showLabel ? "mb-3 block text-sm text-[color:var(--jd-muted)]" : "sr-only"}>
              {label}
            </span>
          ) : null}
          <div
            className={cn(
              "transition-opacity duration-[var(--jd-dur-fast)] motion-reduce:transition-none",
              fallbackClassName,
              shown ? "opacity-100" : "opacity-0",
            )}
          >
            {fallback}
          </div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
