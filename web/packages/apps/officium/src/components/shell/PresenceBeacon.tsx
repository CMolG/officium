"use client";

import { usePresenceBeacon } from "../../lib/presence/use-presence-beacon";

/** Renders nothing: it exists so the beacon mounts only for a signed-in person (JAVA-1144). */
export function PresenceBeacon() {
  usePresenceBeacon();
  return null;
}
