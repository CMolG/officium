/**
 * `DetailsDismiss` on Android: nothing. There is no `<details>` to dismiss or to lift into a top
 * layer — the Javadaba menu there is a native sheet (JAVA-1486), which closes on its own Back and
 * outside tap, and a native `Modal` already draws above everything else on screen.
 */
export function DetailsDismiss() {
  return null;
}
