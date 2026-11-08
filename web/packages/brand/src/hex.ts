/*
 * hex.ts: the little color arithmetic the generated pieces share (the seal stage, the tool marks).
 * `chroma.ts` is the perceptual one (OKLCH, contrast); this is plain sRGB mixing on hex strings.
 */

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** `hex` moved `toward` white by that share (0 keeps it, 1 is white). */
export function lighten(hex: string, toward: number): string {
  return `#${channels(hex)
    .map((c) =>
      Math.round(c + (255 - c) * toward)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** `hex` moved toward black by that share (0 keeps it, 1 is black). */
export function darken(hex: string, toward: number): string {
  return `#${channels(hex)
    .map((c) =>
      Math.round(c * (1 - toward))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** `hex` at `alpha` over a white page: what a translucent tint looks like on paper. */
export function onWhite(hex: string, alpha: number): string {
  return lighten(hex, 1 - alpha);
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
