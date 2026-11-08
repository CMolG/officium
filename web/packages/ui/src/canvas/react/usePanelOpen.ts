'use client';

// packages/ui/src/canvas/react/usePanelOpen.ts
//
// Whether a chrome panel is open, kept in `state.chrome.panels[key]` (open by default). The engine
// remembers it; the app decides where to persist it through `EngineProvider`'s `onChange`, so a
// folded panel stays folded per app.

import { useCallback } from 'react';
import { useEngine, useEngineSelector } from './hooks';

export function usePanelOpen(key: string): [boolean, (open: boolean) => void] {
  const engine = useEngine();
  const open = useEngineSelector((state) => state.chrome.panels[key] ?? true);
  const setOpen = useCallback(
    (next: boolean) => {
      const { chrome } = engine.getState();
      engine.setState({ chrome: { ...chrome, panels: { ...chrome.panels, [key]: next } } });
    },
    [engine, key],
  );
  return [open, setOpen];
}
