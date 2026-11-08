"use client";

/**
 * The web half of what the presence beacon reads from the browser (JAVA-1144): the device's id,
 * its coarse label, the close beat on `pagehide`, and the beats the mock backend records for e2e.
 * Android's twin is `presence-env.native.ts`.
 */

const DEVICE_KEY = "officium.presence.device";

export type RecordedBeat = { kind: "beat"; visible: boolean; focused: boolean } | { kind: "close" };

declare global {
  interface Window {
    /** What the mock backend's beacon "sent": there is no API to receive it. */
    __OFFICIUM_PRESENCE__?: RecordedBeat[];
  }
}

let tabDevice: string | null = null;

/**  only exists in secure contexts; a frame on a blank parent is not one. */
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Kept in `localStorage` so a device stays one row across visits; a per-tab id when storage is off. */
export function deviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const fresh = newId();
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    tabDevice ??= newId();
    return tabDevice;
  }
}

/** Browser and OS family only, never the full user agent. */
export function deviceLabel(): string {
  const data = (navigator as Navigator & { userAgentData?: { platform?: string; brands?: { brand: string }[] } })
    .userAgentData;
  const ua = navigator.userAgent;
  const browser =
    data?.brands?.map((b) => b.brand).find((b) => /chrome|edge|opera|brave/i.test(b) && !/chromium/i.test(b))
    ?? (/Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser");
  const os =
    data?.platform
    ?? (/Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "");
  return os ? `${browser} on ${os}` : browser;
}

/** `sendBeacon` survives the page going away; a `text/plain` body keeps the request free of a preflight. */
export function sendClose(url: string): void {
  if (!navigator.sendBeacon?.(url, "")) void fetch(url, { method: "POST", credentials: "include", keepalive: true });
}

export function onPageHide(listener: () => void): () => void {
  window.addEventListener("pagehide", listener);
  return () => window.removeEventListener("pagehide", listener);
}

export function recordBeat(beat: RecordedBeat): void {
  (window.__OFFICIUM_PRESENCE__ ??= []).push(beat);
}
