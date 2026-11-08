/**
 * The page just created, opened in the editor when its address mounts. Module scope, not state: the
 * page panel is keyed by its path, so the one at the new address mounts fresh after the navigation.
 * Only the panel AT that address takes it, never the one navigating away. A const holder read
 * through functions, so the React Compiler never reorders a read of it against its clear.
 */
const pending: { path: string | null } = { path: null };

export function markPendingEdit(path: string): void {
  pending.path = path;
}

export function isPendingEdit(path: string | null): boolean {
  return path !== null && pending.path === path;
}

export function clearPendingEdit(): void {
  pending.path = null;
}
