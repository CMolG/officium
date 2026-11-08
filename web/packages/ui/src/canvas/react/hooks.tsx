'use client';

// packages/ui/src/canvas/react/hooks.tsx
//
// The engine's public hooks, all built on `useSyncExternalStore` against
// `EngineProvider`'s store. `useEngine()` is the imperative escape hatch
// (getState/setState/subscribe); the rest are selectors for one specific
// slice, memo-safe (stable reference while the slice does not change —
// see the comment on `setState` in core/store.ts).

import { useCallback, useContext, useSyncExternalStore } from 'react';
import { EngineContext } from './EngineProvider';
import type { EngineState, EngineStore } from '../core/store';
import type { CameraState } from '../core/types';

export function useEngine(): EngineStore {
  const store = useContext(EngineContext);
  if (!store) {
    throw new Error('useEngine (and any other @javadaba/ui/canvas hook) must be used within <EngineProvider>');
  }
  return store;
}

/**
 * Generic selector over the engine's store. Public because `chrome/` and
 * external consumers also need to subscribe to slices that do not have
 * their own dedicated hook (e.g. `state.activeGuides`, `state.chrome`).
 */
export function useEngineSelector<T>(selector: (state: EngineState) => T): T {
  const store = useEngine();
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(() => onStoreChange()),
    [store],
  );
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCamera(): CameraState {
  return useEngineSelector((state) => state.camera);
}

export function useSelection(): { ids: Set<string> } {
  return useEngineSelector((state) => state.selection);
}

export function useEngineItem(id: string) {
  return useEngineSelector((state) => state.items[id]);
}

export function useZIndex(id: string): number {
  return useEngineSelector((state) => state.zOrder[id] ?? 0);
}

export interface UseHoveredItemResult {
  hoveredItemId: string | null;
  setHoveredItemId: (id: string | null) => void;
}

/** The hover that fires the symmetric highlight between ComponentsPanel <-> CanvasItem. */
export function useHoveredItem(): UseHoveredItemResult {
  const store = useEngine();
  const hoveredItemId = useEngineSelector((state) => state.hoveredItemId);
  const setHoveredItemId = useCallback((id: string | null) => store.setState({ hoveredItemId: id }), [store]);
  return { hoveredItemId, setHoveredItemId };
}

export interface UseSnapToGridResult {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

/** Reads and toggles `snap.grid.enabled` — THE snap-to-grid toggle that did not exist in any source. */
export function useSnapToGrid(): UseSnapToGridResult {
  const store = useEngine();
  const enabled = useEngineSelector((state) => state.snap.grid.enabled);
  const setEnabled = useCallback(
    (next: boolean) => {
      const { snap } = store.getState();
      store.setState({ snap: { ...snap, grid: { ...snap.grid, enabled: next } } });
    },
    [store],
  );
  const toggle = useCallback(() => setEnabled(!store.getState().snap.grid.enabled), [store, setEnabled]);
  return { enabled, setEnabled, toggle };
}
