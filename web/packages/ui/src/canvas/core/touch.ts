// packages/ui/src/canvas/core/touch.ts
//
// Touch as pure functions (Lib-Canvas "Touch", JAVA-1497): one finger moves the field, a pinch
// zooms around the point between the fingers, and drawing a box to select is a mode of its own
// (switched on from the dock), so a drag never selects by accident.

import { clampZoom } from './camera';
import type { CameraState, Point, ZoomBounds } from './types';
import { DEFAULT_ZOOM_BOUNDS } from './types';

/** What one finger does on the field: moves it (`pan`) or draws a selection box (`select`). */
export type TouchMode = 'pan' | 'select';

/** What the fingers are doing right now: nothing, moving the field, or zooming around themselves. */
export type TouchGesture = 'idle' | 'pan' | 'pinch';

export interface TouchState {
  mode: TouchMode;
  gesture: TouchGesture;
}

export const DEFAULT_TOUCH_STATE: TouchState = { mode: 'pan', gesture: 'idle' };

/** A finger further than this from where it landed is moving, not tapping (screen px). */
export const TAP_SLOP_PX = 8;

/**
 * The DOM event the field sends to an item when a finger has rested on it long enough: the item
 * takes the finger over and moves with it. `detail` is a {@link PickupDetail}.
 */
export const PICKUP_EVENT = 'daba-pickup';

export interface PickupDetail {
  pointerId: number;
  clientX: number;
  clientY: number;
}

/** How long a finger rests on an item before the item is picked up (ms). */
export const PICKUP_HOLD_MS = 350;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export interface PinchStart {
  camera: CameraState;
  /** The two fingers when the pinch began, in the canvas's own frame (client minus its top-left). */
  a: Point;
  b: Point;
}

/**
 * The camera a pinch asks for: the zoom follows the fingers' distance (within the engine's zoom
 * limits) and the world point that was between the fingers stays between them as they move, so the
 * zoom is "around your fingers" and a two-finger drag also moves the field.
 */
export function pinchCamera(
  start: PinchStart,
  a: Point,
  b: Point,
  bounds: ZoomBounds = DEFAULT_ZOOM_BOUNDS,
): CameraState {
  const startDistance = distance(start.a, start.b);
  if (startDistance === 0) return start.camera;
  const zoom = clampZoom((start.camera.zoom * distance(a, b)) / startDistance, bounds);
  const startMid = midpoint(start.a, start.b);
  const world: Point = {
    x: (startMid.x - start.camera.pan.x) / start.camera.zoom,
    y: (startMid.y - start.camera.pan.y) / start.camera.zoom,
  };
  const mid = midpoint(a, b);
  return { zoom, pan: { x: mid.x - world.x * zoom, y: mid.y - world.y * zoom } };
}

/** Zoom by a step around the middle of the canvas: what the dock's 44 px buttons do for anyone who cannot pinch. */
export function zoomStep(
  camera: CameraState,
  center: Point,
  factor: number,
  bounds: ZoomBounds = DEFAULT_ZOOM_BOUNDS,
): CameraState {
  const zoom = clampZoom(camera.zoom * factor, bounds);
  if (zoom === camera.zoom) return camera;
  const scale = zoom / camera.zoom;
  return {
    zoom,
    pan: { x: center.x + (camera.pan.x - center.x) * scale, y: center.y + (camera.pan.y - center.y) * scale },
  };
}

/** True when a finger has moved far enough from where it landed that it is no longer a tap. */
export function movedBeyondTap(from: Point, to: Point): boolean {
  return distance(from, to) > TAP_SLOP_PX;
}
