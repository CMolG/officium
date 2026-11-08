// packages/ui/src/canvas/core/store.ts
//
// The engine's own minimal store (no zustand — an architecture decision
// from plan #20: zero runtime dependencies). Designed to be consumed
// from React via `useSyncExternalStore` (react/ layer, Task 5) but with
// no React dependency here at all: it is pure subscription logic.
//
// Persistence is NOT the engine's job (see ADR 0002): `EngineConfig.onChange`
// receives every patch so the consumer decides what and where to save
// (e.g. with `./storage`'s `DebouncedStorage`).

import type { CameraState, GridSpec, Point, Size, SnapGuide } from './types';
import { DEFAULT_GRID_SPEC } from './types';
import type { SnapConfig } from './snap';
import type { ZOrder } from './z-order';
import type { TouchState } from './touch';
import { DEFAULT_TOUCH_STATE } from './touch';

/** Minimal item the engine governs geometrically; the domain (content, data type) is defined by the consumer. */
export interface EngineItem {
  id: string;
  /** Free-form domain discriminator ("window" | "step" | "frame" | ...); the engine does not interpret this value. */
  kind: string;
  position: Point;
  size: Size;
  /** Domain data, opaque to the engine. */
  meta?: unknown;
}

export interface SelectionState {
  ids: Set<string>;
}

export interface ChromeState {
  /** Chrome panels open/closed by id (e.g. "sideToolbar", "componentsPanel"). */
  panels: Record<string, boolean>;
}

export interface EngineState {
  camera: CameraState;
  items: Record<string, EngineItem>;
  selection: SelectionState;
  zOrder: ZOrder;
  snap: SnapConfig;
  hoveredItemId: string | null;
  chrome: ChromeState;
  /**
   * Alignment guides active RIGHT NOW (transient: only has content while
   * `CanvasItem` is dragging an item; empty at rest). It lives in the
   * store because `SnapGuidesOverlay` (react/) needs to re-render live
   * without the dragged item also having to re-render — the drag itself
   * remains "zero re-render" via direct mutation of `style.transform`.
   */
  activeGuides: SnapGuide[];
  /** What one finger does (`mode`) and what the fingers are doing right now (`gesture`); transient, never persisted. */
  touch: TouchState;
}

export type EngineStateKey = keyof EngineState;

export type EngineListener = (state: EngineState, patchKeys: EngineStateKey[]) => void;

export interface EngineConfig {
  initialState?: Partial<EngineState>;
  onChange?: EngineListener;
}

export interface EngineStore {
  getState(): EngineState;
  setState(patch: Partial<EngineState>): void;
  subscribe(listener: EngineListener): () => void;
}

function defaultGridSpec(): GridSpec {
  return DEFAULT_GRID_SPEC;
}

export function createDefaultEngineState(): EngineState {
  return {
    camera: { pan: { x: 0, y: 0 }, zoom: 1 },
    items: {},
    selection: { ids: new Set() },
    zOrder: {},
    snap: {
      grid: { enabled: false, spec: defaultGridSpec() },
      guides: { enabled: true, threshold: 8 },
    },
    hoveredItemId: null,
    chrome: { panels: {} },
    activeGuides: [],
    touch: DEFAULT_TOUCH_STATE,
  };
}

/**
 * Creates an instance of the engine's store. `setState` does a shallow
 * merge (per slice) and only notifies subscribers (and `onChange`) with
 * the keys whose value actually changed (`Object.is` comparison, shallow
 * — the consumer is responsible for not mutating its slices in place if
 * it wants the comparison to detect the change).
 */
export function createEngineStore(config: EngineConfig = {}): EngineStore {
  let state: EngineState = { ...createDefaultEngineState(), ...config.initialState };
  const listeners = new Set<EngineListener>();

  function getState(): EngineState {
    return state;
  }

  function setState(patch: Partial<EngineState>): void {
    const patchKeys = Object.keys(patch) as EngineStateKey[];
    const changedKeys = patchKeys.filter((key) => !Object.is(state[key], patch[key]));
    if (changedKeys.length === 0) return;

    state = { ...state, ...patch };
    for (const listener of listeners) listener(state, changedKeys);
    config.onChange?.(state, changedKeys);
  }

  function subscribe(listener: EngineListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, setState, subscribe };
}
