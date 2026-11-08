"use client";

import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { TheaterCursor } from "../types";
import { CURSOR_TRAVEL_MS } from "../constants";
import { activeLayer, centerIn, type CursorPosition } from "./cursorGeometry";

interface TargetDeps {
  single: TheaterCursor | null | undefined;
  cycle: number;
  stageRef: RefObject<HTMLElement | null>;
  playingRef: RefObject<boolean>;
  setPos: Dispatch<SetStateAction<CursorPosition | null>>;
}

/** A single cursor aimed at an element: goes to its center once it exists, and clicks it if asked. */
export function useCursorTarget({
  single,
  cycle,
  stageRef,
  playingRef,
  setPos,
}: TargetDeps) {
  useEffect(() => {
    const cursor = single;
    const target = cursor?.target;
    if (!cursor || !target) return;
    const layer = activeLayer(stageRef.current);
    if (!layer) return;

    let clickTimer = 0;
    const locate = () => {
      const el = layer.querySelector<HTMLElement>(target);
      if (!el) return false;
      const at = centerIn(layer, el);
      if (!at) return false;
      setPos({ ...at, cycle, press: 1 });
      if (cursor.act) {
        clickTimer = window.setTimeout(() => {
          if (playingRef.current && el.isConnected) el.click();
        }, CURSOR_TRAVEL_MS + 60);
      }
      return true;
    };

    if (locate()) return () => window.clearTimeout(clickTimer);
    // Lazy scene or content that arrives late: wait for the element to appear.
    const mo =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => {
            if (locate()) mo?.disconnect();
          });
    mo?.observe(layer, { childList: true, subtree: true, attributes: true });
    return () => {
      mo?.disconnect();
      window.clearTimeout(clickTimer);
    };
  }, [single, cycle, stageRef, playingRef, setPos]);
}
