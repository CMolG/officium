"use client";

import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * Board drag-and-drop sensors: mouse, touch and keyboard, per HUMAN-012 (`@dnd-kit`) and
 * JDB-224 item 1 -- the concept's HTML5 drag-and-drop had no keyboard path at all. Modeled on
 * `javadaba-web-os/lib/dnd/sensors.ts`'s pattern (distance-gated pointer + sortable keyboard
 * coordinates).
 *
 * `MouseSensor`, not `PointerSensor` (JAVA-59): a pointer sensor also hears a FINGER, and its 8px
 * threshold is reached before the browser's touch slop (~15px on Android) decides the gesture is a
 * scroll. On a phone every swipe that started on a card -- most of the board, every backlog row --
 * became a drag, and nothing scrolled. Touch goes through `TouchSensor` alone: a long press picks a
 * card up, and a finger that moves before the delay is a scroll, never a drag.
 */
export function useBoardSensors() {
  const mouse = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touch = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboard = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  return useSensors(mouse, touch, keyboard);
}
