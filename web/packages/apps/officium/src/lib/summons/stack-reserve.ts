"use client";

import { useEffect, useSyncExternalStore } from "react";
import { onViewportResize, viewportSize } from "@javadaba/sdk/platform";

import { PHONE_WIDTH } from "./summons-stack-reserve";

/*
 * How many toasts cover a phone's bottom edge (JAVA-1624). SummonsHost reports the count the stack draws,
 * from the viewport's own report, so a dismissed toast gives its room back; each board view reads it and
 * ends with a spacer. A module store, so the platform seam is the only way the page's size is read.
 */

let covered = 0;
const listeners = new Set<() => void>();

function setCovered(next: number): void {
  if (next === covered) return;
  covered = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reports how many toasts are on screen; on a wide page the stack is beside the board, so none is counted. */
export function useStackReserve(count: number): void {
  useEffect(() => {
    const apply = () => setCovered((viewportSize()?.w ?? Infinity) < PHONE_WIDTH ? count : 0);
    apply();
    const stop = onViewportResize(apply);
    return () => {
      stop();
      setCovered(0);
    };
  }, [count]);
}

/** How many toasts the board's end must clear. */
export function useStackReserved(): number {
  return useSyncExternalStore(subscribe, () => covered, () => 0);
}
