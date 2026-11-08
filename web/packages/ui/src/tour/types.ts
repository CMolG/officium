import type { ReactNode } from "react";

/*
 * The guided tour (Library 15, 16): a short spotlight over the real interface, two to five steps,
 * once on a first visit and again from Help. Born in Creatio, now core: every product registers its
 * own tour on this one engine and writes its words in its own language.
 */

/** A side of the lit part. */
export type TourSide = "right" | "left" | "top" | "bottom";

/** Where the card sits around the lit part. `auto` picks the side with the most room. */
export type TourPlacement = "auto" | TourSide | "center";

/** An optional action a step asks for. Doing it moves the tour on by itself; Next always works too. */
export interface TourTryIt {
  /** The line, without the "Try it:" lead (the labels carry that): "drag a Container onto the canvas". */
  label: string;
  /**
   * The DOM event that counts as doing it, heard on the lit part (or on `within`, a selector, when
   * the action happens somewhere else). Omitted, only `advanceTour()` moves the step on.
   */
  on?: { event: string; within?: string };
}

export interface TourStep {
  /** Names the step for `advanceTour(stepId)`. Defaults to its position. */
  id?: string;
  /** CSS selector of the part to light. Omitted, or not on this screen: the step shows centered. */
  target?: string;
  /** What this part is, in a few words. */
  title: string;
  /** One or two sentences on what it does. */
  body: string;
  /** Preferred side of the card. Defaults to `auto`. */
  placement?: TourPlacement;
  /** An action the person may do on the lit part. */
  tryIt?: TourTryIt;
  /** An optional 16:9 picture or loop, for a step easier shown than told. */
  media?: ReactNode;
  /** A part a phone does not show: the step is skipped there. */
  hiddenOnPhone?: boolean;
  /**
   * Holds the step back until it returns true (Son-Tour: "steps 3 and 4 need a station on air"). When
   * the tour reaches a held step it stops there without being recorded as seen, and picks up from that
   * step the first time `when` holds and the page is quiet. Replaying from the first step works as ever.
   * A string is a CSS selector that must match something on the page (the part the step lights).
   */
  when?: string | (() => boolean);
  /** Opens what must be open before the part is measured (a folded panel). May wait. */
  prepare?: () => void | Promise<void>;
}

/** Every word the card, the sheet and the closing line say. English is the default. */
export interface TourLabels {
  /** "1 of 5" */
  stepOf: (step: number, total: number) => string;
  /** The dialog's name: "Your first component, step 1 of 5". */
  dialogName: (tourName: string, step: number, total: number) => string;
  /** The cross's name, which Esc also does. */
  end: string;
  back: string;
  next: string;
  done: string;
  /** The lead before a step's action: "Try it:" */
  tryIt: string;
  /** Read aloud with the card: the lit part's name follows. */
  highlighted: string;
  /** The line that closes a tour. */
  farewell: string;
  closeFarewell: string;
  /** The menu entry that brings the tour back. */
  replay: string;
}

export interface TourDefinition {
  /** Unique, stable: it is the key the "seen" record is kept under. */
  id: string;
  /** The tour's name, in the card's header: "Your first component". */
  name: string;
  /** Brand slug in `@javadaba/brand` (a product or a tool): the seal in the card. */
  brand: string;
  /** Three to five steps. */
  steps: readonly TourStep[];
  /** Defaults to English. A Spanish product passes `TOUR_LABELS_ES`. */
  labels?: TourLabels;
  /** BCP 47 tag set on the card, when it differs from the page's. */
  lang?: string;
}

export const MIN_TOUR_STEPS = 2;
export const MAX_TOUR_STEPS = 5;
