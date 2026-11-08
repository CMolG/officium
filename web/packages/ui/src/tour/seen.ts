/*
 * Which tours a person has already ended. Ending is final: Done, the cross and Esc all write here,
 * and a tour that is recorded never opens by itself again (it still replays on request).
 *
 * The default record is this browser's `localStorage`: right for a signed-out visitor. A signed-in
 * product keeps it per account by handing `configureTourSeen` a store of its own, so the tour does
 * not come back on another device.
 *
 * TODO(backend): a per-account record of seen tours (read on sign-in, `PUT` on ending) so
 * `configureTourSeen` can be backed by the account instead of the browser; until it exists a
 * signed-in person sees each tour once per browser.
 */

export interface TourSeenStore {
  has(tourId: string): boolean;
  add(tourId: string): void;
  remove(tourId: string): void;
}

const KEY = "jd-tours-seen";

function readBrowser(): string[] {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeBrowser(ids: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private windows and blocked storage: the tour may come back once. That is the honest cost.
  }
}

/** The browser's own record: tolerant of storage that is missing, full or blocked. */
export const browserTourSeen: TourSeenStore = {
  has: (tourId) => readBrowser().includes(tourId),
  add: (tourId) => {
    const ids = readBrowser();
    if (!ids.includes(tourId)) writeBrowser([...ids, tourId]);
  },
  remove: (tourId) => writeBrowser(readBrowser().filter((id) => id !== tourId)),
};

let store: TourSeenStore = browserTourSeen;

/** Replaces where "seen" is kept, once, at the app's start. */
export function configureTourSeen(next: TourSeenStore): void {
  store = next;
}

export function hasSeenTour(tourId: string): boolean {
  return store.has(tourId);
}

export function markTourSeen(tourId: string): void {
  store.add(tourId);
}

/** Forgets a tour so it opens by itself again (tests, and "show me everything again"). */
export function forgetTour(tourId: string): void {
  store.remove(tourId);
}
