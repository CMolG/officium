"use client";

import { useSyncExternalStore } from "react";

import { clearPaused, pauseTourAt, pausedAt } from "./paused";
import { markTourSeen } from "./seen";
import { MAX_TOUR_STEPS, MIN_TOUR_STEPS, type TourDefinition } from "./types";

/*
 * The tour registry and the one running tour. A product registers its tours at module load
 * (`defineTour`) and starts one from anywhere (`startTour`): a menu entry, the window's help
 * button, the first-visit hook. One tour runs at a time; starting another replaces it.
 */

export interface TourState {
  /** The running tour, or null. */
  tourId: string | null;
  /** Zero-based position of the step on screen. */
  index: number;
  /** Which way the person last moved, so a step skipped on a phone is skipped the same way. */
  direction: 1 | -1;
  /** The tour whose closing line is showing. */
  farewellFor: string | null;
}

const IDLE: TourState = { tourId: null, index: 0, direction: 1, farewellFor: null };

const tours = new Map<string, TourDefinition>();
const listeners = new Set<() => void>();
let state: TourState = IDLE;

function set(next: TourState): void {
  state = next;
  for (const listen of listeners) listen();
}

/**
 * Registers a tour and returns it. Two to five steps, never more (Curriculum's is two): a longer tour is two tours,
 * one per page, as Tributa does. Registering the same id again replaces it (hot reload).
 */
export function defineTour(definition: TourDefinition): TourDefinition {
  const count = definition.steps.length;
  if (count < MIN_TOUR_STEPS || count > MAX_TOUR_STEPS) {
    throw new Error(`Tour "${definition.id}" has ${count} steps; a tour has ${MIN_TOUR_STEPS} to ${MAX_TOUR_STEPS}.`);
  }
  tours.set(definition.id, definition);
  return definition;
}

export function getTour(tourId: string): TourDefinition | undefined {
  return tours.get(tourId);
}

/** Every registered tour, in registration order. */
export function listTours(): readonly TourDefinition[] {
  return [...tours.values()];
}

/** Starts a tour from its first step. Returns false when no tour has that id. */
export function startTour(tourId: string): boolean {
  if (!tours.has(tourId)) return false;
  clearPaused(tourId);
  set({ tourId, index: 0, direction: 1, farewellFor: null });
  return true;
}

/** Whether the step is held back by its `when` (Son-Tour). */
function held(tourId: string, index: number): boolean {
  const when = tours.get(tourId)?.steps[index]?.when;
  if (typeof when === "string") return document.querySelector(when) === null;
  return Boolean(when && !when());
}

/** Stops the running tour at a held step: not recorded as seen, no closing line. */
function pauseRunning(index: number): void {
  if (!state.tourId) return;
  pauseTourAt(state.tourId, index);
  set(IDLE);
}

/**
 * Picks a stopped tour up from the step it was waiting at, once that step's `when` holds. Returns
 * false while it still does not, or when the tour is not stopped.
 */
export function resumeTour(tourId: string): boolean {
  const index = pausedAt(tourId);
  if (index === undefined || !tours.has(tourId) || held(tourId, index)) return false;
  clearPaused(tourId);
  set({ tourId, index, direction: 1, farewellFor: null });
  return true;
}

/** Ends the running tour for good: it is recorded as seen and the closing line shows. */
export function endTour(): void {
  if (!state.tourId) return;
  markTourSeen(state.tourId);
  clearPaused(state.tourId);
  set({ ...IDLE, farewellFor: state.tourId });
}

/** Next step; on the last one, Done: the tour ends. */
export function nextTourStep(): void {
  const tour = state.tourId ? tours.get(state.tourId) : undefined;
  if (!tour) return;
  if (state.index + 1 >= tour.steps.length) {
    endTour();
    return;
  }
  if (held(tour.id, state.index + 1)) {
    pauseRunning(state.index + 1);
    return;
  }
  set({ ...state, index: state.index + 1, direction: 1 });
}

/** Back one step. There is no Back on the first. */
export function prevTourStep(): void {
  if (!state.tourId || state.index === 0) return;
  set({ ...state, index: state.index - 1, direction: -1 });
}

/**
 * The person did what a step asked: moves on. With a `stepId`, only when that step is the one on
 * screen, so a late event from an earlier step cannot skip a later one.
 */
export function advanceTour(stepId?: string): void {
  const tour = state.tourId ? tours.get(state.tourId) : undefined;
  if (!tour) return;
  const current = tour.steps[state.index];
  if (stepId !== undefined && (current?.id ?? String(state.index)) !== stepId) return;
  nextTourStep();
}

/** Hides the closing line. */
export function dismissFarewell(): void {
  if (state.farewellFor) set({ ...state, farewellFor: null });
}

export function tourState(): TourState {
  return state;
}

function subscribe(listen: () => void): () => void {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

/** The running tour and step; the server and the first paint see no tour. */
export function useTourState(): TourState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}

/** Test seam: forget every tour and the running one. */
export function resetTours(): void {
  tours.clear();
  set(IDLE);
}
