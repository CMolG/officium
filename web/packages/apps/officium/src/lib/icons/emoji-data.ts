import type { SkinTone } from "./skin-tone";

/** One emoji of the data, with its skin-tone variants (each one a single tone or a pair of tones). */
export interface EmojiEntry {
  emoji: string;
  label: string;
  tags: string[];
  group: number;
  version: number;
  skins: { emoji: string; label: string; tones: number[] }[];
}

const TONE_NUMBER: Record<SkinTone, number | null> = {
  default: null,
  light: 1,
  "medium-light": 2,
  medium: 3,
  "medium-dark": 4,
  dark: 5,
};


/** The groups the picker shows, in order; `component` (the modifiers) is left out. */
export const EMOJI_GROUPS: { id: number; title: string; glyph: string }[] = [
  { id: 0, title: "Smileys & emotion", glyph: "😀" },
  { id: 1, title: "People & body", glyph: "🧑" },
  { id: 3, title: "Animals & nature", glyph: "🐻" },
  { id: 4, title: "Food & drink", glyph: "🍔" },
  { id: 5, title: "Travel & places", glyph: "🚗" },
  { id: 6, title: "Activities", glyph: "⚽" },
  { id: 7, title: "Objects", glyph: "💡" },
  { id: 8, title: "Symbols", glyph: "🔣" },
  { id: 9, title: "Flags", glyph: "🏁" },
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const stringOr = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);

function parseSkin(raw: unknown): EmojiEntry["skins"][number] | null {
  if (!isRecord(raw) || typeof raw.emoji !== "string") return null;
  const tones = typeof raw.tone === "number" ? [raw.tone] : Array.isArray(raw.tone) ? raw.tone.filter((t) => typeof t === "number") : [];
  return tones.length > 0 ? { emoji: raw.emoji, label: stringOr(raw.label, raw.emoji), tones } : null;
}

function parseEntry(raw: unknown): EmojiEntry | null {
  if (!isRecord(raw) || typeof raw.emoji !== "string" || typeof raw.group !== "number") return null;
  const skins = Array.isArray(raw.skins) ? raw.skins.flatMap((skin) => parseSkin(skin) ?? []) : [];
  return {
    emoji: raw.emoji,
    label: stringOr(raw.label, raw.emoji),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
    group: raw.group,
    version: typeof raw.version === "number" ? raw.version : 0,
    skins,
  };
}

/** Narrows the raw data to entries; a malformed one is skipped, never thrown on. */
export function parseEmojiData(raw: unknown): EmojiEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => parseEntry(item) ?? []);
}

/**
 * The emoji to draw for a tone: the variant whose tones all equal the viewer's tone (a mixed pair is
 * never chosen for a single tone), else the base emoji. `default` always draws the base.
 */
export function emojiForTone(entry: EmojiEntry, tone: SkinTone): string {
  const number = TONE_NUMBER[tone];
  if (number === null) return entry.emoji;
  const variant = entry.skins.find((skin) => skin.tones.every((t) => t === number));
  return variant?.emoji ?? entry.emoji;
}

/** The entry of a saved emoji, found by its own glyph or by one of its skin variants; undefined when none is. */
export function entryOfEmoji(entries: EmojiEntry[], value: string): EmojiEntry | undefined {
  return entries.find((entry) => entry.emoji === value || entry.skins.some((skin) => skin.emoji === value));
}

/** The group of a saved emoji; undefined when none is. */
export function groupOfEmoji(entries: EmojiEntry[], value: string): number | undefined {
  return entryOfEmoji(entries, value)?.group;
}

/** Whether an entry has skin variants, so the tone choice means something for it. */
export const hasSkinTones = (entry: EmojiEntry): boolean => entry.skins.length > 0;
