/**
 * Relative luminance of a brand color *as it actually appears on screen*.
 *
 * It's not the luminance of the raw hex: Javadaba's accents are painted over a ~58%
 * white base (the accent-surface recipe, see `app-widget.md`), so what the eye
 * receives is the MIX, not the pure color. Measuring the raw hex alone was calling
 * "dark" accents that come out pale in the actual piece.
 *
 * It serves a single decision, but an important one: **if the face is light, the ink
 * on top of it has to be black**. This is what resolves the debt declared in
 * `design-surfaces.md` (`Button variant="accent"` used to carry fixed black ink over
 * any accent, and with dark accents — Fluxor's `#2563eb` — that came out to ~2.4:1).
 */
export function faceLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
  const channel = (i: number) => parseInt(full.slice(i, i + 2), 16);
  // The 42% white base the piece carries underneath.
  const mix = (v: number) => 0.58 * v + 0.42 * 255;
  const [r, g, b] = [mix(channel(0)), mix(channel(2)), mix(channel(4))];
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * The ink that belongs on top of an accent fill: black if the face is light, white if
 * it's dark. The threshold (0.62) is chosen against the catalog's twelve accents, not
 * eyeballed: it's the point where the worst case on each side stays above 4.5:1.
 */
export function inkOn(hex: string): "#000000" | "#ffffff" {
  return faceLuminance(hex) > 0.62 ? "#000000" : "#ffffff";
}
