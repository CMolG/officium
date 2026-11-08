"use client";

import { useEffect } from "react";

/** Hidden tab. */
export function useHiddenTabHold(
  hold: (key: string) => void,
  release: (key: string) => void,
) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => (document.hidden ? hold("hidden") : release("hidden"));
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [hold, release]);
}
