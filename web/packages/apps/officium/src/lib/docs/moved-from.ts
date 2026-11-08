/**
 * The old path a page was just reached through, so its new address can say "Moved from …" after the
 * URL is replaced. Module scope, not state: the page panel is keyed by its path, so the one at the
 * new address mounts fresh, and state would not survive (the same reason the pending edit is kept
 * this way).
 */
let remembered: { to: string; from: string } | null = null;

export function rememberMovedFrom(to: string, from: string): void {
  remembered = { to, from };
}

/** What was remembered for `path`; pure, so a render may read it twice. */
export function peekMovedFrom(path: string): string | null {
  return remembered?.to === path ? remembered.from : null;
}

export function forgetMovedFrom(): void {
  remembered = null;
}
