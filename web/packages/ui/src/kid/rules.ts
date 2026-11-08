/*
 * The Kid moment's rules (canvas board 22, Album 13.21): each moment once, ever, and at most one card a day per person.
 * A moment that comes when today's card was already shown waits for the next visit. The store is the app's own
 * key-value store, so the rules carry over to Android unchanged.
 */

export interface KidStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LAST_DAY = "kid:last-day";
const seenKey = (id: string) => `kid:seen:${id}`;

/** The person's local day, "2026-11-02": one card per day is per local calendar day. */
export const dayOf = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export const wasShown = (store: KidStore, id: string): boolean => store.getItem(seenKey(id)) !== null;

/** Whether a card may show now: not shown before, and none shown today. */
export const mayShow = (store: KidStore, id: string, now: Date): boolean => !wasShown(store, id) && store.getItem(LAST_DAY) !== dayOf(now);

/** Records the card as shown: never again, and nothing else today. */
export function markShown(store: KidStore, id: string, now: Date) {
  store.setItem(seenKey(id), dayOf(now));
  store.setItem(LAST_DAY, dayOf(now));
}
