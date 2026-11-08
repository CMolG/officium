"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { TheaterCursor } from "../types";
import { CURSOR_TRAVEL_MS } from "../constants";
import { activeLayer, centerIn, type CursorPosition } from "./cursorGeometry";

interface TourDeps {
  tour: readonly TheaterCursor[] | null;
  playing: boolean;
  cycle: number;
  getElapsed: () => number;
  stageRef: RefObject<HTMLElement | null>;
  playingRef: RefObject<boolean>;
  setPos: Dispatch<SetStateAction<CursorPosition | null>>;
}

/**
 * Path: each step is scheduled against the scene's clock, so hover, interaction,
 * offscreen, or a hidden tab stop it and it resumes where it was on return.
 */
export function useCursorTour({
  tour,
  playing,
  cycle,
  getElapsed,
  stageRef,
  playingRef,
  setPos,
}: TourDeps) {
  // Next path step, per cycle: a pause does not reset it, a new cycle does.
  const nextRef = useRef({ cycle: -1, step: 0 });

  useEffect(() => {
    if (!tour || !playing) return;
    const layer = activeLayer(stageRef.current);
    if (!layer) return;
    if (nextRef.current.cycle !== cycle) nextRef.current = { cycle, step: 0 };

    let timer = 0;
    let clickTimer = 0;
    // Step that moved the cursor and has not clicked yet: if the pause lands in between, it
    // repeats in full on resume instead of losing the click.
    let pendingAct: number | null = null;

    const schedule = () => {
      const i = nextRef.current.step;
      const step = tour[i];
      if (!step) return;
      timer = window.setTimeout(
        () => run(i),
        Math.max(0, (step.at ?? 0) - getElapsed()),
      );
    };

    const run = (i: number) => {
      const step = tour[i];
      nextRef.current.step = i + 1;
      const el = step.target
        ? layer.querySelector<HTMLElement>(step.target)
        : null;
      const at = el
        ? centerIn(layer, el)
        : step.target
          ? null
          : { x: step.x ?? 50, y: step.y ?? 50 };
      // Missing target (the view changed because someone tapped it): the step is skipped, not waited on.
      if (at) {
        setPos((p) => ({
          ...at,
          cycle,
          press: step.click ? (p?.press ?? 0) + 1 : (p?.press ?? 0),
        }));
        if (el && step.act) {
          pendingAct = i;
          clickTimer = window.setTimeout(() => {
            pendingAct = null;
            if (playingRef.current && el.isConnected) el.click();
          }, CURSOR_TRAVEL_MS + 60);
        }
      }
      schedule();
    };

    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clickTimer);
      if (pendingAct !== null) nextRef.current.step = pendingAct;
    };
  }, [tour, playing, cycle, getElapsed, stageRef, playingRef, setPos]);
}
