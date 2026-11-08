"use client";

import { useCallback, useEffect, useState } from "react";

import { onMainPageHide, openPopOutWindow, type PoppedOut } from "../../lib/shell/pop-out";

/**
 * The tray out of the tab. `open` makes the window; closing it (its own close, or the page going away) brings the tray
 * back. `blocked` is true after a popup the browser refused, so the page can say so instead of doing nothing.
 */
export function usePopOut(title: string) {
  const [popped, setPopped] = useState<PoppedOut | null>(null);
  const [blocked, setBlocked] = useState(false);

  const open = useCallback(async () => {
    const made = await openPopOutWindow(title);
    setBlocked(made === null);
    if (made) setPopped(made);
  }, [title]);
  const close = useCallback(() => setPopped(null), []);

  useEffect(() => {
    if (!popped) return;
    const { win } = popped;
    const gone = () => setPopped(null);
    win.addEventListener("pagehide", gone);
    const stop = onMainPageHide(() => win.close());
    return () => {
      win.removeEventListener("pagehide", gone);
      stop();
      win.close();
    };
  }, [popped]);

  return { popped, blocked, open, close };
}
