/**
 * `useBackDismisses` on Android: nothing to hold. The native `Modal` that draws a dialog there
 * receives the system Back itself, through its `onRequestClose` -- which is where the dialog's
 * Android twin (JAVA-1486) closes, with the same guards its Escape runs on the web.
 */
export function useBackDismisses(_active: boolean, _address?: { path: string; under: string }): () => void {
  return noop;
}

function noop(): void {}
