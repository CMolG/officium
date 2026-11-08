import { buttonFill } from "@javadaba/brand";

import { inkOn } from "./luminance";

export type ButtonFill = "flat" | "gradient" | undefined;
type Stops = { start: string; mid: string; end: string };

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * The background and ink of `Button variant="accent"`. Pure so it is testable without a DOM:
 * jsdom's `CSSStyleDeclaration` may drop `var()` and gradient values.
 *
 * `flat` is the original behavior, untouched. `gradient` is the owner's Option 1 (X08): the button fills
 * with the product's solid accent ink and a white label at 4.5:1 (`buttonFill`); the gradient itself stays
 * on surfaces that carry no text.
 */
export function accentFill(fill: ButtonFill, accent: string | Stops | undefined): { background: string; color: string } {
  if (fill !== "gradient") {
    const flat = typeof accent === "string" ? accent : undefined;
    return { background: flat ?? "var(--jd-accent)", color: flat ? inkOn(flat) : "var(--jd-accent-on, #000)" };
  }
  if (!accent || typeof accent === "string") {
    return { background: "var(--jd-accent-fill)", color: "var(--jd-accent-fill-on, #fff)" };
  }
  const stops = [accent.start, accent.mid, accent.end];
  if (!stops.every((stop) => HEX.test(stop.trim()))) {
    return { background: "var(--jd-accent-fill)", color: "var(--jd-accent-fill-on, #fff)" };
  }
  const deep = buttonFill(stops);
  return { background: deep.background, color: deep.ink };
}
