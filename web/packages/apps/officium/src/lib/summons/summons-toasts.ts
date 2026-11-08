import { toast } from "@javadaba/ui";

import type { Copy } from "../i18n";
import { cardPath } from "../backlog/search-links";
import { notifyLocally } from "../shell/pwa";
import type { Summons, SummonsItem } from "./summons";

/*
 * The summons as toasts (JAVA-1624): one sticky toast per pending item, with Answer and Later on each.
 * The stack keeps the place rules (three visible, first in first out, "N more waiting"); this file says
 * what each toast shows and when it comes and goes. The only importer of `toast` in this app.
 */

type SummonsCopy = Copy["summons"];

const SNOOZED_ID = "summons-snoozed";
const LOAD_FAILED_ID = "summons-load-failed";

/** The toast of one item: stable per item, so a new round replaces it in place. */
export function toastIdOf(item: SummonsItem): string {
  return `summons-${item.id}`;
}

export interface ToastPlan {
  /** The items to raise: new since the last plan, or raised again by a new round. */
  raise: SummonsItem[];
  /** The toasts that must leave: their item was answered, or the summons closed. */
  dismiss: string[];
  /** The raised map after this plan: toast id to the round that raised it. */
  next: Map<string, number>;
}

/**
 * What to show for the summons now, given what the page raised before. Pure: a toast the person
 * dismissed stays out until the server starts a new round, because it stays in `raised`.
 */
export function planToasts(summons: Summons | null, raised: ReadonlyMap<string, number>): ToastPlan {
  const next = new Map<string, number>();
  const raise: SummonsItem[] = [];
  if (summons) {
    for (const item of summons.items) {
      const id = toastIdOf(item);
      next.set(id, summons.round);
      if (raised.get(id) !== summons.round) raise.push(item);
    }
  }
  const dismiss = [...raised.keys()].filter((id) => !next.has(id));
  return { raise, dismiss, next };
}

/** What the person does from a toast: answer the item, or let every item of the summons wait. */
export interface ToastHandlers {
  answer(item: SummonsItem): void;
  /** A viewer cannot answer; they can open the card to read what is asked. */
  open(item: SummonsItem): void;
  later(): void;
}

/** Raises one item's toast. A viewer reads what is asked, and has no Answer. */
export function raiseItem(summons: Summons, item: SummonsItem, copy: SummonsCopy, handlers: ToastHandlers): void {
  const kind = item.kind === "form" ? copy.form : copy.request;
  const ask = item.unblocks ? `${kind} · ${copy.unblocks} ${item.unblocks}` : kind;
  const heading = `${item.cardKey} · ${item.action ?? item.cardTitle}`;
  const description = summons.canAnswer ? `${copy.needsYou}: ${ask}` : copy.readOnly;
  // The tab is in the background: the same news as a system notification, if the person allowed them (Off-Shell, JAVA-1674).
  void notifyLocally({ title: heading, body: description, url: cardPath(summons.projectId, item.cardKey), tag: toastIdOf(item) });
  toast(heading, {
    id: toastIdOf(item),
    description,
    variant: "info",
    duration: Infinity,
    action: summons.canAnswer
      ? { label: copy.answer, onClick: () => handlers.answer(item) }
      : { label: copy.openCard, onClick: () => handlers.open(item) },
    cancel: {
      label: summons.items.length > 1 ? copy.laterAll : copy.later,
      onClick: handlers.later,
    },
  });
}

/** Toasts that must leave: an item answered, a summons closed, or Later for every item. */
export function dismissToasts(ids: readonly string[]): void {
  for (const id of ids) toast.dismiss(id);
}

/** Later was pressed: the server asks again in fifteen minutes, and the person is told so. */
export function announceSnoozed(copy: SummonsCopy): void {
  toast.info(copy.snoozed, { id: SNOOZED_ID });
}

/** A failure that is the person's to see: a form that did not open, an answer that was not theirs. */
export function announceProblem(message: string): void {
  toast.error(message);
}

/** The summons could not be read again while one shows: sticky, with Retry, until a read succeeds. */
export function raiseLoadFailed(copy: SummonsCopy, retry: () => void): void {
  toast.warning(copy.loadFailed, {
    id: LOAD_FAILED_ID,
    description: copy.loadFailedHelp,
    duration: Infinity,
    action: { label: copy.retry, onClick: retry },
  });
}

export function dismissLoadFailed(): void {
  toast.dismiss(LOAD_FAILED_ID);
}
