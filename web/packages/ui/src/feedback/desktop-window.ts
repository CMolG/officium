"use client";

import * as React from "react";

/*
 * Inside the desktop an app runs in an iframe, and only the Host knows which window that is
 * (JAVA-1094). The layer asks its parent once and the Host answers; the report then names the
 * window. Outside an iframe nothing is sent. The names are a private pair, not a shell message:
 * `doc://contracts/shell-bridge`.
 */
export const FEEDBACK_CONTEXT_REQUEST = "jd:feedback-context";
export const FEEDBACK_CONTEXT_ANSWER = "jd:feedback-context:answer";

/** The desktop window this app is mounted in, or `undefined` outside the desktop. */
export function useDesktopWindow(): string | undefined {
  const [label, setLabel] = React.useState<string>();
  React.useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; window?: unknown } | null;
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      if (data?.type === FEEDBACK_CONTEXT_ANSWER && typeof data.window === "string") setLabel(data.window);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: FEEDBACK_CONTEXT_REQUEST }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return label;
}
