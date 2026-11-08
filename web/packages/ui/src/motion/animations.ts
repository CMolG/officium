"use client";

import { useSyncExternalStore } from "react";

/*
 * Pause animations (Lib-Theater, "One switch stops every animation"): ONE setting for javadaba.com
 * and every product site. A Theater, a dither field or a doodle has no control of its own; each reads this.
 *
 * - Remembered in this browser as a preference (localStorage, not a cookie that needs consent).
 * - The system first: with `prefers-reduced-motion: reduce` and no saved choice the first visit is
 *   paused, and says why (`source: "system"`). Pressing Play overrides the system for this site.
 * - Every open tab follows: the `storage` event carries a change to the others.
 * - `data-jd-animations="paused"` on <html> lets plain CSS animations hold their frame.
 *
 * TODO(backend): with an account, every device and every app follows it. There is no preferences
 * endpoint yet, so the setting lives in this browser only.
 */

const KEY = "jd-animations";
const REDUCED = "(prefers-reduced-motion: reduce)";

export type AnimationsSource = "user" | "system" | null;
export interface AnimationsState {
  paused: boolean;
  /** Who paused: the person ("user"), their system's reduced motion ("system"), or nobody. */
  source: AnimationsSource;
}

const PLAYING: AnimationsState = { paused: false, source: null };
const PAUSED_BY_USER: AnimationsState = { paused: true, source: "user" };
const PAUSED_BY_SYSTEM: AnimationsState = { paused: true, source: "system" };

const listeners = new Set<() => void>();

function saved(): "paused" | "playing" | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "paused" || value === "playing" ? value : null;
  } catch {
    return null;
  }
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches;
}

function read(): AnimationsState {
  const choice = saved();
  if (choice === "paused") return PAUSED_BY_USER;
  if (choice === "playing") return PLAYING;
  return reducedMotion() ? PAUSED_BY_SYSTEM : PLAYING;
}

function publish(state: AnimationsState) {
  document.documentElement.dataset.jdAnimations = state.paused ? "paused" : "playing";
  listeners.forEach((notify) => notify());
}

/** Pauses (or resumes) every animation on the site; this and every other open tab follow. */
export function setAnimationsPaused(paused: boolean) {
  try {
    window.localStorage.setItem(KEY, paused ? "paused" : "playing");
  } catch {
    // Storage blocked: the choice holds for this page only.
    document.documentElement.dataset.jdAnimations = paused ? "paused" : "playing";
  }
  publish(paused ? PAUSED_BY_USER : PLAYING);
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) publish(read());
  };
  const media = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED) : null;
  const onMedia = () => publish(read());
  window.addEventListener("storage", onStorage);
  media?.addEventListener("change", onMedia);
  document.documentElement.dataset.jdAnimations = read().paused ? "paused" : "playing";
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
    media?.removeEventListener("change", onMedia);
  };
}

/** Whether animations are paused on this site, and who paused them. Playing on the server. */
export function useAnimations(): AnimationsState & { set: (paused: boolean) => void } {
  const state = useSyncExternalStore(subscribe, read, () => PLAYING);
  return { ...state, set: setAnimationsPaused };
}
