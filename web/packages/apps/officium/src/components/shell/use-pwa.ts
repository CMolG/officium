"use client";

import { useSyncExternalStore } from "react";

import { pwaServerSnapshot, pwaSnapshot, subscribePwa, type PwaSnapshot } from "../../lib/shell/pwa";

/** Whether Officium can be installed here, is installed, and what the notification permission says. */
export function usePwa(): PwaSnapshot {
  return useSyncExternalStore(subscribePwa, pwaSnapshot, pwaServerSnapshot);
}
