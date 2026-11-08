import * as React from "react";

import type { ToastItem } from "./toast-store";
import type { ToastLabels } from "./toast.shared";

export interface Announcement {
  key: string;
  text: string;
  /** Errors and warnings interrupt; the rest wait for a pause (Lib-Overlays § toast()). */
  assertive: boolean;
}

/**
 * The sentences a screen reader should speak, once each: a toast's variant, title and description,
 * when it becomes visible. A queued toast waits until it shows; a replaced one (same id, new
 * revision) is spoken again. Only the newest batch is kept, so the live region never grows.
 */
export function useAnnouncements(visible: ToastItem[], labels: ToastLabels): Announcement[] {
  const spoken = React.useRef(new Set<string>());
  const [fresh, setFresh] = React.useState<Announcement[]>([]);

  React.useEffect(() => {
    const next: Announcement[] = [];
    for (const item of visible) {
      if (item.state !== "open") continue;
      const key = `${item.id}#${item.revision}`;
      if (spoken.current.has(key)) continue;
      spoken.current.add(key);
      const text = [`${labels.variant[item.variant]}: ${item.title}`, item.description].filter(Boolean).join(". ");
      next.push({ key, text, assertive: item.variant === "error" || item.variant === "warning" });
    }
    if (next.length > 0) setFresh(next);
  }, [visible, labels]);

  return fresh;
}
