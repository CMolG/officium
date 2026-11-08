"use client";

import { useEffect, type RefObject } from "react";
import type { TheaterPlayReason } from "../types";
import type { TheaterLatest } from "./types";

/**
 * Resume on leave (`resumeOnLeave`). Mouse and pen: on leaving the Theater. Touch has no
 * "leave" (a tap fires `pointerleave` on lifting the finger, which would resume what it just
 * paused), so its equivalent is tapping outside.
 */
export function useResumeOnLeave(
  rootRef: RefObject<HTMLElement | null>,
  resumeOnLeave: boolean,
  latestRef: RefObject<TheaterLatest>,
  play: (reason?: TheaterPlayReason) => void,
) {
  useEffect(() => {
    const el = rootRef.current;
    if (!resumeOnLeave || !el) return;
    const resume = () => {
      if (!latestRef.current.want && !latestRef.current.ended) play("leave");
    };
    const onLeave = (e: globalThis.PointerEvent) => {
      if (e.pointerType !== "touch") resume();
    };
    const onDownOutside = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "touch" && !el.contains(e.target as Node)) resume();
    };
    el.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerdown", onDownOutside, true);
    return () => {
      el.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerdown", onDownOutside, true);
    };
  }, [rootRef, resumeOnLeave, latestRef, play]);
}
