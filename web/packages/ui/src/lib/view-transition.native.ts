/**
 * `withViewTransition` on Android: the change, applied. There is no document to snapshot, and
 * layout motion on Android belongs to the component that moves (Reanimated's `layout` and
 * `entering`/`exiting`, native-portability rule 11), not to a whole-view transition.
 */
export function withViewTransition(change: () => void): void {
  change();
}
