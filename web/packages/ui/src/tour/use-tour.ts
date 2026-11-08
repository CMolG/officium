"use client";

import { useEffect } from "react";

import { pausedAt, pausedTourIds } from "./paused";
import { hasSeenTour } from "./seen";
import { resumeTour, startTour, tourState, useTourState } from "./store";

/** How often a waiting tour looks again for a quiet moment. */
const POLL_MS = 400;

/** Something is open or being typed into that a tour must not cover. */
const BUSY =
  "[role='dialog']:not([data-jd-tour-card]), [role='alertdialog'], [role='menu'], [data-jd-release-gate]";

/**
 * Whether the page is quiet: loaded, no dialog or menu open, no tour running, and no field with
 * something typed into it. "It never opens over a dialog, a form being filled, or the release
 * gate; it waits."
 */
export function pageIsQuiet(): boolean {
  if (document.readyState !== "complete") return false;
  if (tourState().tourId) return false;
  if (document.querySelector(BUSY)) return false;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return active.value === "";
  return !(active instanceof HTMLElement && active.isContentEditable);
}

/**
 * Opens a tour once, on the first visit to the place it explains, as soon as the page is quiet.
 * `ready` holds it back until the part it lights exists (data loaded, the editor mounted). A tour
 * that has been ended never opens by itself again; it still replays on request.
 */
export function useAutoTour(tourId: string, { ready = true }: { ready?: boolean } = {}): void {
  useEffect(() => {
    if (!ready || hasSeenTour(tourId) || pausedAt(tourId) !== undefined) return;
    const look = () => {
      if (!pageIsQuiet() || hasSeenTour(tourId)) return false;
      return startTour(tourId);
    };
    if (look()) return;
    const timer = setInterval(() => {
      if (look()) clearInterval(timer);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [tourId, ready]);
}

/**
 * Picks stopped tours up (Son-Tour): a tour that reached a step held back by `when` resumes there
 * the first time the condition holds and the page is quiet. `TourHost` calls it, once per product.
 */
export function useResumeStoppedTours(): void {
  useEffect(() => {
    const look = () => {
      if (!pageIsQuiet()) return;
      for (const id of pausedTourIds()) if (resumeTour(id)) return;
    };
    look();
    const timer = setInterval(look, POLL_MS);
    return () => clearInterval(timer);
  }, []);
}

export interface TourControls {
  /** Starts (or restarts) the tour from its first step, seen or not. */
  start: () => void;
  /** Whether this tour is the one on screen. */
  active: boolean;
  /** Whether the person has ended it before. */
  seen: boolean;
}

/** One tour's controls, for the menu entry that replays it. */
export function useTour(tourId: string): TourControls {
  const state = useTourState();
  return {
    start: () => {
      startTour(tourId);
    },
    active: state.tourId === tourId,
    seen: hasSeenTour(tourId),
  };
}
