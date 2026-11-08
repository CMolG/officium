import type { TourPlacement, TourSide } from "./types";

/*
 * Where the card goes (Library 15 § Placement). Pure geometry, so it is tested without a DOM.
 *
 *   beside / under / over  the side with the most room, 16 px from the lit part
 *   centered               nothing to light, or no side has room: the card in the middle, no spotlight
 *   sheet                  a phone: the card is a bottom sheet, the lit part stays above it
 *
 * The card never covers what it talks about.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export type CardPlacement =
  | { mode: "sheet" }
  | { mode: "center" }
  | { mode: "side"; side: TourSide; left: number; top: number };

/** Below this width the card is a bottom sheet. */
export const PHONE_MAX_WIDTH = 640;
/** Space between the lit part and the card. */
export const CARD_GAP = 16;
/** Space kept between the card and the viewport's edge. */
export const VIEWPORT_MARGIN = 12;

const ORDER: readonly TourSide[] = ["right", "bottom", "left", "top"];

function roomOn(side: TourSide, target: Box, viewport: Size): number {
  switch (side) {
    case "right":
      return viewport.width - (target.left + target.width) - VIEWPORT_MARGIN;
    case "left":
      return target.left - VIEWPORT_MARGIN;
    case "bottom":
      return viewport.height - (target.top + target.height) - VIEWPORT_MARGIN;
    case "top":
      return target.top - VIEWPORT_MARGIN;
  }
}

function needOn(side: TourSide, card: Size): number {
  return (side === "left" || side === "right" ? card.width : card.height) + CARD_GAP;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function cornerFor(side: TourSide, target: Box, card: Size, viewport: Size): { left: number; top: number } {
  const centerX = target.left + target.width / 2 - card.width / 2;
  const centerY = target.top + target.height / 2 - card.height / 2;
  const maxLeft = viewport.width - card.width - VIEWPORT_MARGIN;
  const maxTop = viewport.height - card.height - VIEWPORT_MARGIN;
  switch (side) {
    case "right":
      return { left: target.left + target.width + CARD_GAP, top: clamp(centerY, VIEWPORT_MARGIN, maxTop) };
    case "left":
      return { left: target.left - CARD_GAP - card.width, top: clamp(centerY, VIEWPORT_MARGIN, maxTop) };
    case "bottom":
      return { left: clamp(centerX, VIEWPORT_MARGIN, maxLeft), top: target.top + target.height + CARD_GAP };
    case "top":
      return { left: clamp(centerX, VIEWPORT_MARGIN, maxLeft), top: target.top - CARD_GAP - card.height };
  }
}

export interface PlaceCardInput {
  /** The lit part's box in viewport coordinates, or null when there is nothing to light. */
  target: Box | null;
  card: Size;
  viewport: Size;
  preferred?: TourPlacement;
}

export function placeCard({ target, card, viewport, preferred = "auto" }: PlaceCardInput): CardPlacement {
  if (viewport.width < PHONE_MAX_WIDTH) return { mode: "sheet" };
  if (!target || preferred === "center") return { mode: "center" };

  const fitting = ORDER.filter((side) => roomOn(side, target, viewport) >= needOn(side, card));
  if (fitting.length === 0) return { mode: "center" };

  const wanted = preferred !== "auto" && fitting.includes(preferred) ? preferred : undefined;
  const side =
    wanted ??
    fitting.reduce((best, next) => (roomOn(next, target, viewport) > roomOn(best, target, viewport) ? next : best));
  return { mode: "side", side, ...cornerFor(side, target, card, viewport) };
}
