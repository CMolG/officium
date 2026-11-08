'use client';

// packages/ui/src/canvas/react/EngineProvider.tsx
//
// React provider over the engine's own store (core/store.ts, no zustand).
// The store gets created ONCE (useMemo with empty deps) and lives for as
// long as the Provider stays mounted; the most recent
// `onChange`/`initialState` are read from a ref so the store does not
// have to be recreated on every render of the consumer.

import { createContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { createEngineStore } from '../core/store';
import type { EngineConfig, EngineStore } from '../core/store';

export const EngineContext = createContext<EngineStore | null>(null);

export interface EngineProviderProps extends EngineConfig {
  children: ReactNode;
  /**
   * External store instance (e.g. a module singleton, Fluxor's
   * `useDesktopStore` pattern, readable outside React and exposable to
   * e2e). When provided, the Provider uses it AS IS — it skips its
   * internal `useMemo(() => createEngineStore(...))` entirely, so THIS
   * Provider's `initialState`/`onChange` get ignored (whoever created
   * the external store already applied them, or applies them itself).
   * Without this prop: identical behavior to today (creates and owns its
   * own store).
   */
  store?: EngineStore;
}

export function EngineProvider({ children, initialState, onChange, store: externalStore }: EngineProviderProps) {
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  const store = useMemo(
    () =>
      externalStore ??
      createEngineStore({
        initialState,
        onChange: (state, patchKeys) => latestOnChange.current?.(state, patchKeys),
      }),
    // Its own store gets created only once per <EngineProvider> instance:
    // changing `initialState` in later renders does not recreate it
    // (same contract as useState(initialValue) — only the first
    // render's value counts). `externalStore` IS in deps: if the
    // consumer changes the instance it passes, the Provider must follow
    // it (a "controlled prop" behavior, not an initial value like
    // `initialState`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [externalStore],
  );

  return <EngineContext.Provider value={store}>{children}</EngineContext.Provider>;
}
