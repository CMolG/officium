/*
 * The Android half of "Pause animations". The site-wide switch is a javadaba.com preference kept in
 * the browser; an Android app has no footer to hold it, and Reanimated already follows the system's
 * reduced motion. So on Android animations always read as playing, and nothing pauses them.
 *
 * TODO(backend): with an account preference, an Android app would read the same choice.
 */

export type AnimationsSource = "user" | "system" | null;
export interface AnimationsState {
  paused: boolean;
  /** Who paused: the person ("user"), their system's reduced motion ("system"), or nobody. */
  source: AnimationsSource;
}

const PLAYING: AnimationsState = { paused: false, source: null };

/** No site-wide switch on Android: the call is accepted and changes nothing. */
export function setAnimationsPaused(_paused: boolean) {}

export function useAnimations(): AnimationsState & { set: (paused: boolean) => void } {
  return { ...PLAYING, set: setAnimationsPaused };
}
