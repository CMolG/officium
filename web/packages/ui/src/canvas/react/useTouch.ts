'use client';

// packages/ui/src/canvas/react/useTouch.ts
//
// The touch slice of the engine for chrome and apps: what one finger does (`mode`, switched from
// the dock) and what the fingers are doing right now (`gesture`, for the status chip).

import { useCallback } from 'react';
import type { TouchGesture, TouchMode } from '../core/touch';
import { useEngine, useEngineSelector } from './hooks';

export interface UseTouchResult {
  mode: TouchMode;
  gesture: TouchGesture;
  setMode: (mode: TouchMode) => void;
}

export function useTouch(): UseTouchResult {
  const engine = useEngine();
  const touch = useEngineSelector((state) => state.touch);
  const setMode = useCallback(
    (mode: TouchMode) => engine.setState({ touch: { ...engine.getState().touch, mode } }),
    [engine],
  );
  return { mode: touch.mode, gesture: touch.gesture, setMode };
}
