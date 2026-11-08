"use client";

import { useEffect } from "react";
import { apiUrl, onPresenceChange, presenceState } from "@javadaba/sdk/platform";

import { USES_MEMORY_BACKEND } from "../backlog/get-repository";
import { deviceId, deviceLabel, onPageHide, recordBeat, sendClose } from "./presence-env";

/** The server counts a device open for 150 s after its last beat: one a minute leaves room for a missed one. */
const BEAT_EVERY_MS = 60_000;

/**
 * Tells the account's agents whether this device has Officium open (JAVA-1144): a beat on every
 * visibility or focus change and every minute while open, and a close beat on `pagehide`. Mounted
 * only for a signed-in person, so an anonymous visitor never writes a row.
 */
export function usePresenceBeacon(): void {
  useEffect(() => {
    const device = deviceId();
    const url = apiUrl(`/api/officium/v1/presence/${device}`);
    const label = deviceLabel();

    const beat = () => {
      const { visible, focused } = presenceState();
      if (USES_MEMORY_BACKEND) {
        recordBeat({ kind: "beat", visible, focused });
        return;
      }
      void fetch(url, {
        method: "PUT",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible, focused, label }),
      }).catch(() => {
        // The next beat says it again; a failed one never needs to reach the person.
      });
    };
    const close = () => {
      if (USES_MEMORY_BACKEND) recordBeat({ kind: "close" });
      else sendClose(`${url}/close`);
    };

    beat();
    const timer = setInterval(beat, BEAT_EVERY_MS);
    const stopChange = onPresenceChange(beat);
    const stopHide = onPageHide(close);
    return () => {
      clearInterval(timer);
      stopChange();
      stopHide();
    };
  }, []);
}
