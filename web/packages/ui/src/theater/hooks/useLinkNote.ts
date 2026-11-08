"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long the "links open in the app" note stays in the window. */
export const LINK_NOTE_MS = 4000;

/** The note a pressed link leaves in the window: shown for four seconds, restarted by the next press. */
export function useLinkNote() {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const show = useCallback(() => {
    clear();
    setShown(true);
    timer.current = window.setTimeout(() => setShown(false), LINK_NOTE_MS);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { shown, show };
}
