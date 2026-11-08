/**
 * The summons (JAVA-1145, officium-api.md §4.6): the forms and requests the person's agents wait on, shown
 * as non-blocking toasts (JAVA-1624). These are the shapes the server answers with.
 */
export interface SummonsItem {
  /** `request:<id>` or `form:<card id>`: stable while the item is pending. */
  id: string;
  kind: "form" | "request";
  cardId: string;
  cardKey: string;
  cardTitle: string;
  /** The AI card(s) that wait on it. */
  unblocks: string | null;
  requestId: string | null;
  action: string | null;
  detail: string | null;
}

export interface Summons {
  id: string;
  projectId: string;
  round: number;
  /** What is still pending: an answered item has left. */
  items: SummonsItem[];
  summonedAt: string;
  delivered: boolean;
  shownAt: string | null;
  seenAt: string | null;
  snoozedUntil: string | null;
  /** False for a viewer of the project: the toast says so instead of offering Answer. */
  canAnswer: boolean;
}

/** What the host needs of the server, so the memory build can stand in for it. */
export interface SummonsClient {
  list(): Promise<Summons[]>;
  /** The summons showed as toasts; `seen` when its tab is visible and focused. */
  shown(summonsId: string, seen: boolean): Promise<void>;
  /** Later: the server asks again in 15 minutes. */
  snooze(summonsId: string): Promise<void>;
  /** Called when the server says the summons changed; returns the unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

/** The summons to show now: the first not snoozed, or the one a link named. */
export function pickShown(all: Summons[], now: number, named: string | null): Summons | null {
  return (
    all.find((s) => s.items.length > 0 && (s.id === named || s.snoozedUntil === null || Date.parse(s.snoozedUntil) <= now)) ??
    null
  );
}

export const SUMMONS_PARAMS = ["view", "projectId", "summons"] as const;
