"use client";

import { useEffect, useState } from "react";
import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";

/** The current time, moved every `everyMs` while the tab is shown and caught up when it is shown again. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      timer ??= setInterval(() => setNow(Date.now()), everyMs);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    if (!isHidden()) start();
    const off = onVisibilityChange((hidden) => (hidden ? stop() : start()));
    return () => {
      stop();
      off();
    };
  }, [everyMs]);
  return now;
}
