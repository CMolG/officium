import { iconsInCategory, type LucideMetadata } from "./icon-search";

/** The id of the picker's first category, the icons a wiki reaches for (kept from JAVA-791's gallery, merged in JAVA-1765). */
export const COMMON_CATEGORY = "common";

const COMMON_ICONS: readonly string[] = [
  "file-text", "book-text", "layers", "shield", "map", "database", "server", "bug", "compass", "list-checks",
  "layout-dashboard", "zap", "users", "calendar", "flag", "star", "activity", "archive", "award", "bell",
  "bookmark", "bot", "box", "braces", "brain", "briefcase", "building", "calculator", "camera", "clipboard",
  "clock", "code", "command", "cpu", "download", "fingerprint-pattern", "flame", "folder", "gauge", "gift",
];

/** The icons of a category, where "common" is the curated list (those the installed Lucide has) in its design order. */
export function iconsOfCategory(metadata: LucideMetadata, category: string): string[] {
  if (category !== COMMON_CATEGORY) return iconsInCategory(metadata, category);
  return COMMON_ICONS.filter((id) => metadata.icons[id]);
}
