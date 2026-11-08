"use client";

import { useEffect, type RefObject } from "react";
import type { EmitEvent } from "./types";

/** On-screen visibility: a "view" event once, and a hold while off viewport. */
export function useOffscreenHold(
  rootRef: RefObject<HTMLElement | null>,
  pauseOffscreen: boolean,
  hold: (key: string) => void,
  release: (key: string) => void,
  emit: EmitEvent,
) {
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let viewed = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !viewed) {
          viewed = true;
          emit({ type: "view" });
        }
        if (!pauseOffscreen) return;
        if (entry.isIntersecting) release("offscreen");
        else hold("offscreen");
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      release("offscreen");
    };
  }, [rootRef, pauseOffscreen, hold, release, emit]);
}
