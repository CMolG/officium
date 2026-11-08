/** How many emoji of one Unicode version are tried before a version counts as drawn; a few suffice. */
const PROBES_PER_VERSION = 3;

/**
 * The highest Unicode version this device draws in colour, or `null` when none does. For each version,
 * ascending, a few single emoji are tried; a version with one coloured hit is supported. `isColored` is
 * injected so the rule is a pure function (the browser's canvas check lives in `emoji-probe.ts`).
 */
export function maxSupportedEmojiVersion(
  entries: { emoji: string; version: number }[],
  isColored: (emoji: string) => boolean,
): number | null {
  const versions = [...new Set(entries.map((entry) => entry.version))].sort((a, b) => a - b);
  let best: number | null = null;
  for (const version of versions) {
    const probes = entries.filter((entry) => entry.version === version).slice(0, PROBES_PER_VERSION);
    if (probes.some((entry) => isColored(entry.emoji))) best = version;
  }
  return best;
}

/**
 * The entries to draw. Failing open: with no measured version at all (no canvas, or a device that draws
 * nothing in colour), everything is shown, so no emoji is hidden on a guess.
 */
export function drawableEntries<T extends { version: number }>(entries: T[], maxVersion: number | null): T[] {
  return maxVersion === null ? entries : entries.filter((entry) => entry.version <= maxVersion);
}
