"use client";

import { useEffect, useState } from "react";

/**
 * The height (px) something fixed to the bottom of the page reserves for itself, so a floating
 * piece can dock above it instead of under it. The analytics consent bar (`@javadaba/analytics`'s
 * `ConsentBanner`) publishes its height as `body`'s `padding-bottom` while it is on screen; this
 * reads it and follows it. `0` while `active` is false.
 *
 * Web half of a pair: on Android there is no page body to pad (`use-bottom-reserve.native.ts`).
 */
export function useBottomReserve(active: boolean): number {
  const [reserve, setReserve] = useState(0);
  useEffect(() => {
    if (!active) return;
    const read = () => setReserve(Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0);
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, [active]);
  return active ? reserve : 0;
}
