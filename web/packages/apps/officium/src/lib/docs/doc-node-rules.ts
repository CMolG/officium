/**
 * What a documentation node's icon and colour may be, by the API's own rules (`DocNode`,
 * officium-api.md §8.17): an icon is a lucide id or exactly one emoji; a colour is one of the
 * closed palette. Checked here so a form can say what is wrong before anything is sent.
 */
const ICON_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEYCAP = /^[0-9#*]️?⃣$/u;
const FLAG = /^\p{Regional_Indicator}{2}$/u;
const MAX_ICON_LENGTH = 40;

export const DOC_COLORS = ["slate", "red", "orange", "amber", "green", "teal", "blue", "indigo", "violet", "pink"] as const;
export type DocColor = (typeof DOC_COLORS)[number];

export function isDocIcon(value: string): boolean {
  if (value.length === 0 || value.length > MAX_ICON_LENGTH) return false;
  if (ICON_ID.test(value)) return true;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];
  if (graphemes.length !== 1) return false;
  if (KEYCAP.test(value) || FLAG.test(value)) return true;
  return /\p{Extended_Pictographic}/u.test(value) && !/[a-z0-9]/i.test(value);
}

export const isDocColor = (value: string): value is DocColor => (DOC_COLORS as readonly string[]).includes(value);

/** A Lucide icon id: kebab-case, the shape the API keeps (`DocNode.requireIcon`). */
export const isLucideIconId = (value: string): boolean => ICON_ID.test(value) && value.length <= MAX_ICON_LENGTH;

/** An emoji icon: a valid icon that is not an id. */
export const isEmojiIcon = (value: string): boolean => isDocIcon(value) && !ICON_ID.test(value);
