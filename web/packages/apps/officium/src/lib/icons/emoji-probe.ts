import { maxSupportedEmojiVersion } from "./emoji-support";

/** A pixel is coloured when its channels differ: a missing glyph is drawn as a monochrome box. */
const COLOUR_SPREAD = 24;
const SIZE = 40;

/**
 * Whether the device draws this emoji in colour, read from an `OffscreenCanvas` (no `document`, so the
 * same file serves a native build). Without the canvas, or when reading pixels throws, the answer is `null`.
 */
export function drawsInColour(emoji: string): boolean | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  try {
    const context = new OffscreenCanvas(SIZE, SIZE).getContext("2d");
    if (!context) return null;
    context.font = "32px sans-serif";
    context.fillText(emoji, 2, 32);
    const { data } = context.getImageData(0, 0, SIZE, SIZE);
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      const channels = [data[index], data[index + 1], data[index + 2]];
      if (Math.max(...channels) - Math.min(...channels) > COLOUR_SPREAD) return true;
    }
    return false;
  } catch {
    return null;
  }
}

/**
 * The newest Unicode version this device draws, from the entries it is given. Failing open is the caller's
 * rule: a `null` here means "show everything".
 */
export function probeMaxVersion(entries: { emoji: string; version: number }[]): number | null {
  return maxSupportedEmojiVersion(entries, (emoji) => drawsInColour(emoji) === true);
}
