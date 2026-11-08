import { NOISE_BASE_FREQUENCY, NOISE_COLOR, NOISE_OPACITY } from "../constants";
import type { BrandNoise } from "../registry";

/**
 * The API seal's grain: a single `#AAAAAA` layer at 25% with a `baseFrequency` of 0.85, the
 * noise inherited from the base logo.
 *
 * A grain with several layers (the glass seal's, the accent surface's) gives each one **its
 * own seed and offset**. That's what makes the grain read as two-tone instead of an averaged
 * gray: if the layers shared turbulence, they'd land perfectly overlapped and the result would
 * be the average of their colors.
 */
export const DEFAULT_NOISE: BrandNoise = {
  // Figma `grain` equivalent to the inherited `baseFrequency` 0.85 (1/0.85).
  grain: 1 / NOISE_BASE_FREQUENCY,
  layers: [{ color: NOISE_COLOR, opacity: NOISE_OPACITY }],
};

/**
 * Figma grain size -> `feTurbulence`'s `baseFrequency`. The scales run in
 * opposite directions (Figma: small = fine; SVG: high = fine), so the
 * conversion is the inverse. It's the ONLY translation between the two worlds:
 * the registry always stores the number exactly as it comes out of Figma.
 */
export function baseFrequencyFor(grain: number): number {
  return grain > 0 ? 1 / grain : NOISE_BASE_FREQUENCY;
}

/** Seed and offset per layer, to desynchronize the grain. */
export const NOISE_SEEDS = [2, 7, 13, 29];
export const NOISE_OFFSETS = [0, 41, 83, 127];
