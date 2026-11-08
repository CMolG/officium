"use client";

import { useSyncExternalStore } from "react";
import type { KidDoodle } from "@javadaba/brand/doodles";

import { type KidStore, markShown, mayShow } from "./rules";

/** One moment: the kid in its pose, a title, one line with the real names, at most one action. */
export interface KidMoment {
  /** Shown once, ever: "album.first-like". */
  id: string;
  pose: KidDoodle;
  title: string;
  line: string;
  action?: { label: string; href?: string; onSelect?: () => void };
}

let current: KidMoment | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/*
 * The one moment on screen (board 22's Kid moment). An app offers a moment at a pause; the rules decide whether it
 * shows now (once ever, one a day). False means it waits: the app may offer it again on a later visit.
 */
export const kidMoments = {
  offer(moment: KidMoment, store: KidStore, now: Date = new Date()): boolean {
    if (current || !mayShow(store, moment.id, now)) return false;
    markShown(store, moment.id, now);
    current = moment;
    emit();
    return true;
  },
  close() {
    current = null;
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  snapshot: (): KidMoment | null => current,
};

export function useKidMoment(): KidMoment | null {
  return useSyncExternalStore(kidMoments.subscribe, kidMoments.snapshot, () => null);
}
