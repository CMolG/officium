// Card detail wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.
import type { Checkpoint } from "./checkpoints";
import type { DevLink } from "./github-types";
import type { Actor, Card } from "./types";
import type { TimeEntry } from "./time-types";

/** One answer to a human card's form, with the question's own words kept beside it. `value` is text,
 *  a boolean, a number, or a list of strings for a multiple choice. */
export interface FormAnswer {
  questionId: string;
  prompt: string;
  value: string | boolean | number | string[] | null;
}

/**
 * A human card's Quaestio form as the card shows it (officium-api.md §8.16, JAVA-894). `open` while
 * the card waits on its person, `answered` once it moved on with an answer, `closed` when it moved
 * on without one. `answers` are the latest answer's, only while `answered`; `history` is every
 * answer the form took, oldest first. `fillPath` is where Quaestio serves the form.
 */
export interface CardForm {
  formId: string;
  slug: string;
  fillPath: string;
  questionCount: number;
  state: "open" | "answered" | "closed";
  answers: FormAnswer[];
  answeredAt: string | null;
  history: {
    responseId: string;
    respondentAccountId: string | null;
    respondentName: string | null;
    answeredAt: string;
    answers: FormAnswer[];
  }[];
}

export interface Comment {
  id: string;
  cardId: string;
  author: Actor;
  text: string;
  createdAt: string;
  updatedAt: string;
  /** The comment of the same card this one replies to (JAVA-524); absent or null at the top level. */
  parentId?: string | null;
}

/** A file that lives on the project's machine, never on Javadaba's servers (JDB-242). `path` is
 *  relative to that machine's `.officium/attachments/` folder; opening it fetches it from there. */
export interface Attachment {
  id: string;
  cardId: string;
  name: string;
  size: number;
  contentType: string;
  path: string;
  createdAt: string;
}

export interface CardDetail extends Card {
  comments: Comment[];
  timeEntries: TimeEntry[];
  attachments: Attachment[];
  /** Newest activity first; filled by GitHub's events, never written by hand. */
  development: DevLink[];
  /** How many cards belong to it, for an epic; null (or absent) for any other card (JAVA-292). */
  epicChildren?: number | null;
  /** How many of those are not done yet: a person moves an epic only once it is 0 (JAVA-379). */
  epicChildrenOpen?: number | null;
  /** The Quaestio form the card is answered with; null or absent while it has none (JAVA-890). */
  form?: CardForm | null;
  /** An epic's cards in the order one session works them (card://JAVA-1876); null or absent for any other card. */
  checkpoints?: Checkpoint[] | null;
}

export interface Activity {
  id: string;
  projectId: string;
  cardId: string | null;
  cardKey: string | null;
  actor: Actor;
  /** "card.moved", "card.created"... -- see officium-api.md §4 for the vocabulary. */
  operation: string;
  summary: string;
  at: string;
}
