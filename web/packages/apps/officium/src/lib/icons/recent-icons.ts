import { isDocIcon, isEmojiIcon, isLucideIconId } from "../docs/doc-node-rules";
import { SKIN_TONES, isSkinTone, type SkinTone } from "./skin-tone";

/** Per-viewer conveniences, kept in this browser only: a failing storage means no memory, never an error. */
const RECENT_KEY = "officium-recent-icons";
const TONE_KEY = "officium-emoji-skin-tone";
const RECENT_LIMIT = 6;

export type RecentKind = "icons" | "emoji";
type Recent = Record<RecentKind, string[]>;

const readRaw = (key: string): string | null => {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeRaw = (key: string, value: string) => {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage is blocked or full: the picker still works, it just does not remember.
  }
};

const valid = (kind: RecentKind, value: unknown): value is string =>
  typeof value === "string" && (kind === "icons" ? isLucideIconId(value) : isEmojiIcon(value));

function readKind(kind: RecentKind, parsed: unknown): string[] {
  const list = parsed && typeof parsed === "object" ? (parsed as Partial<Recent>)[kind] : undefined;
  return Array.isArray(list) ? list.filter((value): value is string => valid(kind, value)).slice(0, RECENT_LIMIT) : [];
}

export function readRecent(kind: RecentKind): string[] {
  const raw = readRaw(RECENT_KEY);
  if (raw === null) return [];
  try {
    return readKind(kind, JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Puts a saved icon first; the list stays deduplicated and at most six long. */
export function rememberRecent(icon: string) {
  if (!isDocIcon(icon)) return;
  const kind: RecentKind = isLucideIconId(icon) ? "icons" : "emoji";
  const next: Recent = { icons: readRecent("icons"), emoji: readRecent("emoji") };
  next[kind] = [icon, ...next[kind].filter((value) => value !== icon)].slice(0, RECENT_LIMIT);
  writeRaw(RECENT_KEY, JSON.stringify(next));
}

export function readSkinTone(): SkinTone {
  const raw = readRaw(TONE_KEY);
  return isSkinTone(raw) && SKIN_TONES.includes(raw) ? raw : "default";
}

export function rememberSkinTone(tone: SkinTone) {
  writeRaw(TONE_KEY, tone);
}
