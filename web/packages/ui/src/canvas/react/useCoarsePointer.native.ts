// packages/ui/src/canvas/react/useCoarsePointer.native.ts
//
// On Android a finger is always the pointer: the canvas has no hover and its panels are sheets.

export function useCoarsePointer(): boolean {
  return true;
}
