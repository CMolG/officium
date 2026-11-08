/**
 * `useBottomReserve` on Android: there is no page body a bar pads, and the screen owns its safe
 * area. Not type-checked by `packages/ui`'s `tsc` yet (JAVA-99 brings `react-native`).
 */
export function useBottomReserve(_active: boolean): number {
  return 0;
}
