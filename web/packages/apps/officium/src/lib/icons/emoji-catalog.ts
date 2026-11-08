import { parseEmojiData, type EmojiEntry } from "./emoji-data";
import { probeMaxVersion } from "./emoji-probe";
import { drawableEntries } from "./emoji-support";

export interface EmojiSet {
  /** The entries this device draws: a version the device cannot draw is left out. */
  entries: EmojiEntry[];
}

const cache: { set?: Promise<EmojiSet> } = {};

/**
 * The emoji data, loaded the first time the Emoji pane opens, and filtered to what this device draws. A
 * failed load is forgotten, so the next attempt imports again.
 */
export function loadEmojiSet(): Promise<EmojiSet> {
  cache.set ??= import("emojibase-data/en/data.json").then(
    (module) => {
      const all = parseEmojiData(module.default);
      const maxVersion = probeMaxVersion(all);
      return { entries: drawableEntries(all, maxVersion) };
    },
    (error: unknown) => {
      cache.set = undefined;
      throw error;
    },
  );
  return cache.set;
}
