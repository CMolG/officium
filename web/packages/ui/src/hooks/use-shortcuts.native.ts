import type { Shortcut } from "./use-shortcuts";

/** `useShortcuts` on Android: a phone has no keyboard shortcuts to register. */
export function useShortcuts(_shortcuts: readonly Shortcut[]): void {}
