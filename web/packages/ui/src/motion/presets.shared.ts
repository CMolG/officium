/**
 * The system's motion jobs, as numbers (JAVA-1486, JAVA-106). The web runs them as the `jd-fade`,
 * `jd-pop`, `jd-sheet` and `jd-slide-*` keyframes of `tokens.css`, the `active:` classes of the
 * pieces and CSS transitions; the Android twins cannot (the
 * native token filter cuts `@keyframes`), so `presets.native.ts` builds Reanimated keyframes from
 * this spec and `presets.test.ts` pins every number here against the CSS.
 */

export type LayerKind = "fade" | "pop" | "sheet" | "slide-right" | "slide-left";
export type LayerDirection = "in" | "out";

/** `--jd-dur-slow` is the entrance (400), `--jd-dur-base` every exit (250); the curves are `--ease-jd` and `--ease-jd-in`. */
export const LAYER_DURATION = { in: 400, out: 250 } as const;
export const LAYER_EASING = { in: [0.22, 1, 0.36, 1], out: [0.55, 0, 1, 0.45] } as const;
/** `--jd-motion-scale`. */
export const POP_SCALE = 0.96;

export interface LayerFrame {
  opacity: number;
  scale: number;
  /** Fraction of the layer's travel it sits below its resting place (`--jd-motion-edge: 100%`). */
  translateY: number;
  /** Fraction of the layer's width it sits to the right (positive) or left (negative) of its resting place. (The web travels 28 px, `--jd-motion-slide`; Android has no fixed length to borrow.) */
  translateX: number;
}

export interface LayerSpec {
  duration: number;
  /** The cubic-bezier control points of the curve. */
  easing: readonly [number, number, number, number];
  from: LayerFrame;
  to: LayerFrame;
}

const REST: LayerFrame = { opacity: 1, scale: 1, translateY: 0, translateX: 0 };

/**
 * One layer's move. `reduced` is the web's policy (tokens.css § 6): less motion, not none --
 * the travel and the scale are zeroed and the fade stays.
 */
export function layerSpec(kind: LayerKind, direction: LayerDirection, reduced: boolean): LayerSpec {
  const away: LayerFrame = {
    opacity: 0,
    scale: kind === "pop" && !reduced ? POP_SCALE : 1,
    translateY: kind === "sheet" && !reduced ? 1 : 0,
    translateX: reduced ? 0 : kind === "slide-right" ? 1 : kind === "slide-left" ? -1 : 0,
  };
  return {
    duration: LAYER_DURATION[direction],
    easing: LAYER_EASING[direction],
    from: direction === "in" ? away : REST,
    to: direction === "in" ? REST : away,
  };
}

/*
 * The other jobs of `doc://contracts/design-system/motion`. Press feedback is the pieces' `active:`
 * classes (every button and panel presses to `scale-[0.98]` on `--jd-dur-instant`),
 * and under reduced motion the scale is dropped for `opacity-80`. A layout change and a shared
 * element take `--jd-dur-base` on `--ease-jd`: what moves is the subject.
 */
export type PressRegister = "pill" | "ui";

export const PRESS_DURATION = 100;
export const PRESS_SCALE = { pill: 0.98, ui: 0.98 } as const;
export const PRESS_REDUCED_OPACITY = 0.8;
export const LAYOUT_DURATION = 250;
export const LAYOUT_EASING = LAYER_EASING.in;

export interface PressSpec {
  duration: number;
  /** Resting is `scale: 1, opacity: 1`. */
  pressed: { scale: number; opacity: number };
}

export function pressSpec(register: PressRegister, reduced: boolean): PressSpec {
  return {
    duration: PRESS_DURATION,
    pressed: reduced ? { scale: 1, opacity: PRESS_REDUCED_OPACITY } : { scale: PRESS_SCALE[register], opacity: 1 },
  };
}
