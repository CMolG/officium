import type {
  Card,
  CardForm,
  Category,
  Signal,
  Status,
} from "../types";
import { markdownPlainText } from "@javadaba/rich-text";
import { SIGNAL_ORDER } from "../role-config";

/** The API's own messages for JAVA-292's two refusals (`CardRules.java`). */
export const EPIC_NOT_WORKABLE = "An epic isn't worked directly: work its children, which carry its badge";
export const EPIC_HAS_NO_CHILDREN =
  "An epic with no children can only be refined: first give it a card whose epic names its key";

/** `CardService.shapesAnEpic` (JAVA-379): a write to this card can change an epic's children. */
export const shapesAnEpic = (card: { category: Category | null; epic: string | null }) =>
  card.category === "epic" || Boolean(card.epic?.trim());

/** The API's `Status.needsPerson()` (JAVA-586): from Ready on, a human card's person is done. */
export const needsPerson = (status: Status) => status === "refine" || status === "todo" || status === "doing";
/** Counts as "delivered" for the contributions metrics (officium-api.md §8.3): the card reached
 *  review or later. */
export const isDelivered = (status: Status) => status === "review" || status === "deploy" || status === "done";

/** The API's excerpt (`Card.excerpt()`): the description as one line of plain text, 160 at most. */
export function excerptOf(description: string): string {
  const plain = markdownPlainText(description).replace(/\s+/g, " ").trim();
  if (plain.length <= 160) return plain;
  const cut = plain.lastIndexOf(" ", 160);
  return `${plain.slice(0, cut > 80 ? cut : 160).trimEnd()}…`;
}

/** `Card.sameContentAs` in the API: the fields a person edits, blank text equal to no text. */
export function sameContent(
  card: Card,
  next: Pick<Card, "title" | "description" | "actionPlan" | "priority" | "category" | "signals" | "subtype" | "estimate" | "epic" | "tags">,
): boolean {
  return card.title === next.title
    && (card.description || "") === (next.description || "")
    && (card.actionPlan || "") === (next.actionPlan || "")
    && card.priority === next.priority
    && card.category === next.category
    && card.signals.join("\u0000") === next.signals.join("\u0000")
    && card.subtype === next.subtype
    && card.estimate === next.estimate
    && (card.epic ?? "") === (next.epic ?? "")
    && card.tags.join("\u0000") === next.tags.join("\u0000");
}

/** Signals in the server's order, each once. */
export function normalizedSignals(signals: readonly Signal[]): Signal[] {
  return SIGNAL_ORDER.filter((s) => signals.includes(s));
}

export function now(): string {
  return new Date().toISOString();
}

/** `CardFormRules.state`: open while the card waits on its person, then answered or closed. */
export function formAt(form: CardForm, status: Status): CardForm {
  const state = needsPerson(status) ? "open" : form.history.length > 0 ? "answered" : "closed";
  const latest = form.history[form.history.length - 1];
  return { ...form, state, answers: state === "answered" && latest ? latest.answers : [] };
}

export const KEY_PREFIX_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
