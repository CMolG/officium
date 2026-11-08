'use client';

// packages/ui/src/canvas/react/useCoarsePointer.ts
//
// Whether the main pointer is a finger (`(pointer: coarse)`): the canvas then has no hover and its
// panels become sheets (Lib-Canvas "Touch"). False on the server and where `matchMedia` is missing.

import { useSyncExternalStore } from 'react';

const QUERY = '(pointer: coarse)';

function subscribe(notify: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

const snapshot = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
