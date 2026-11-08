'use client';

// packages/ui/src/canvas/react/useTouchField.ts
//
// What fingers do to the field (Lib-Canvas "Touch", JAVA-1497): one finger drags the field and
// never selects or moves an item, two fingers pinch-zoom around the point between them, a tap on
// the bare field clears the selection. Drawing a box is a mode of its own (`touch.mode ===
// 'select'`): in that mode this hook steps aside and the canvas's marquee takes the finger.
// Mouse and pen are not its business; every function answers `false` for them.

import { useCallback, useMemo, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import {
  PICKUP_HOLD_MS,
  PICKUP_EVENT,
  movedBeyondTap,
  pinchCamera,
  type PickupDetail,
  type PinchStart,
  type TouchGesture,
} from '../core/touch';
import type { CameraState, Point } from '../core/types';
import type { EngineStore } from '../core/store';
import { useEngine } from './hooks';

interface PanStart {
  pointerId: number;
  startScreen: Point;
  startPan: Point;
  startedOnField: boolean;
  moved: boolean;
  /** The item under the finger when it landed, and the timer that picks it up. */
  press: { itemId: string; element: Element; timer: ReturnType<typeof setTimeout> } | null;
}

/** Resting on an item picks it up: the item takes this finger over and the field lets go of it. */
function armPickup(element: Element, pointerId: number, at: Point, letGo: (pointerId: number) => void): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    const detail: PickupDetail = { pointerId, clientX: at.x, clientY: at.y };
    element.dispatchEvent(new CustomEvent<PickupDetail>(PICKUP_EVENT, { detail }));
    letGo(pointerId);
  }, PICKUP_HOLD_MS);
}

/** A tap selects the item under the finger; a tap on the bare field clears the selection. */
function settleTap(engine: EngineStore, lifted: PanStart) {
  if (lifted.press) engine.setState({ selection: { ids: new Set([lifted.press.itemId]) } });
  else if (lifted.startedOnField) engine.setState({ selection: { ids: new Set() } });
}

/** The camera after a finger has dragged the field from where it landed to `at`. */
function dragged(camera: CameraState, from: PanStart, at: Point): CameraState {
  return { ...camera, pan: { x: from.startPan.x + at.x - from.startScreen.x, y: from.startPan.y + at.y - from.startScreen.y } };
}

export interface TouchField {
  /** `true` when the finger is the field's (the canvas must not run its mouse gestures for it). */
  onPointerDown(event: ReactPointerEvent<HTMLDivElement>): boolean;
  onPointerMove(event: ReactPointerEvent<HTMLDivElement>): boolean;
  onPointerUp(event: ReactPointerEvent<HTMLDivElement>): boolean;
}

export function useTouchField(containerRef: RefObject<HTMLDivElement | null>): TouchField {
  const engine = useEngine();
  const fingers = useRef(new Map<number, Point>());
  const pan = useRef<PanStart | null>(null);
  const pinch = useRef<PinchStart | null>(null);

  const setGesture = useCallback(
    (gesture: TouchGesture) => {
      const { touch } = engine.getState();
      if (touch.gesture !== gesture) engine.setState({ touch: { ...touch, gesture } });
    },
    [engine],
  );

  const local = useCallback(
    (point: Point): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      return rect ? { x: point.x - rect.left, y: point.y - rect.top } : point;
    },
    [containerRef],
  );

  const release = useCallback(
    (pointerId: number) => {
      fingers.current.delete(pointerId);
      if (pan.current?.pointerId === pointerId) pan.current = null;
      if (fingers.current.size === 0) setGesture('idle');
    },
    [setGesture],
  );

  const startPan = useCallback(
    (pointerId: number, at: Point, target: Element | null, startedOnField: boolean, moved: boolean) => {
      const element = target?.closest?.('[data-daba-item-id]') ?? null;
      const itemId = element?.getAttribute('data-daba-item-id') ?? null;
      pan.current = {
        pointerId,
        startScreen: at,
        startPan: engine.getState().camera.pan,
        startedOnField,
        moved,
        press: element && itemId && !moved ? { itemId, element, timer: armPickup(element, pointerId, at, release) } : null,
      };
      setGesture('pan');
    },
    [engine, release, setGesture],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): boolean => {
      if (event.pointerType !== 'touch') return false;
      if (engine.getState().touch.mode === 'select') return false;
      // Only the field and what sits on it: a finger on the dock, a panel or the inspector is theirs,
      // and capturing it here would swallow their click.
      const target = event.target as Element;
      if (target !== event.currentTarget && !target.closest?.('.daba-pan-layer')) return false;
      const at = { x: event.clientX, y: event.clientY };
      fingers.current.set(event.pointerId, at);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (fingers.current.size === 1) {
        startPan(event.pointerId, at, event.target as Element, event.target === event.currentTarget, false);
        return true;
      }
      if (fingers.current.size === 2) {
        const [a, b] = [...fingers.current.values()].map(local);
        if (pan.current?.press) clearTimeout(pan.current.press.timer);
        pan.current = null;
        pinch.current = { camera: engine.getState().camera, a, b };
        setGesture('pinch');
      }
      return true;
    },
    [engine, local, setGesture, startPan],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): boolean => {
      if (event.pointerType !== 'touch' || !fingers.current.has(event.pointerId)) return false;
      const at = { x: event.clientX, y: event.clientY };
      fingers.current.set(event.pointerId, at);
      if (pinch.current) {
        const [a, b] = [...fingers.current.values()].slice(0, 2).map(local);
        engine.setState({ camera: pinchCamera(pinch.current, a, b) });
        return true;
      }
      const current = pan.current;
      if (!current || current.pointerId !== event.pointerId) return true;
      if (!current.moved && movedBeyondTap(current.startScreen, at)) {
        current.moved = true;
        if (current.press) clearTimeout(current.press.timer);
      }
      if (current.moved) engine.setState({ camera: dragged(engine.getState().camera, current, at) });
      return true;
    },
    [engine, local],
  );

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>): boolean => {
      if (event.pointerType !== 'touch' || !fingers.current.has(event.pointerId)) return false;
      fingers.current.delete(event.pointerId);
      const lifted = pan.current?.pointerId === event.pointerId ? pan.current : null;
      if (lifted?.press) clearTimeout(lifted.press.timer);
      if (lifted && !lifted.moved && event.type === 'pointerup') settleTap(engine, lifted);
      const [rest] = [...fingers.current.entries()];
      pinch.current = null;
      pan.current = null;
      if (rest) startPan(rest[0], rest[1], null, false, true); // the finger left over carries on moving the field, without a jump
      else setGesture('idle');
      return true;
    },
    [engine, setGesture, startPan],
  );

  return useMemo(
    () => ({ onPointerDown, onPointerMove, onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  );
}
