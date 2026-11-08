/** The Lucide metadata snapshot (`scripts/lucide-metadata.mjs`), as the picker reads it. */
export interface LucideMetadata {
  version: string;
  categories: { id: string; title: string; icon: string }[];
  icons: Record<string, { c: string[]; t: string[] }>;
  aliases: Record<string, string>;
}

export const SEARCH_LIMIT = 300;

const norm = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const words = (text: string) => norm(text).split(/[\s_-]+/).filter(Boolean);

/**
 * How well one name matches the query, lower is better; `null` when it does not match at all. Every
 * query word must be a prefix of a name word or a keyword word, or (three letters or more) a part of the name.
 */
export function rankIcon(name: string, tags: string[], query: string): number | null {
  const queryWords = words(query);
  if (queryWords.length === 0) return null;
  const nameWords = words(name);
  const nameText = nameWords.join("-");
  const queryText = queryWords.join("-");
  if (nameText === queryText) return 0;
  if (nameText.startsWith(queryText)) return 1;
  if (queryWords.every((word) => nameWords.some((part) => part.startsWith(word)))) return 2;
  const keywords = tags.flatMap(words);
  if (queryWords.every((word) => nameWords.some((part) => part.startsWith(word)) || keywords.some((tag) => tag.startsWith(word)))) return 3;
  if (queryWords.every((word) => word.length >= 3 && nameText.includes(word))) return 4;
  return null;
}

/** The aliases of each canonical id, inverted from the snapshot's `alias -> canonical` map. */
export function aliasesByIcon(aliases: Record<string, string>): Map<string, string[]> {
  const byIcon = new Map<string, string[]>();
  for (const [alias, icon] of Object.entries(aliases)) byIcon.set(icon, [...(byIcon.get(icon) ?? []), alias]);
  return byIcon;
}

/** Every canonical id that matches, best first, then alphabetical; `total` counts them all before the limit. */
export function searchIcons(metadata: LucideMetadata, query: string, limit = SEARCH_LIMIT): { ids: string[]; total: number } {
  const byIcon = aliasesByIcon(metadata.aliases);
  const hits = Object.entries(metadata.icons).flatMap(([id, { t }]) => {
    const ranks = [id, ...(byIcon.get(id) ?? [])].map((name) => rankIcon(name, t, query));
    const best = ranks.reduce<number | null>((min, rank) => (rank !== null && (min === null || rank < min) ? rank : min), null);
    return best === null ? [] : [{ id, rank: best }];
  });
  hits.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  return { ids: hits.slice(0, limit).map((hit) => hit.id), total: hits.length };
}

/** Every canonical id of one category, alphabetical. */
export function iconsInCategory(metadata: LucideMetadata, category: string): string[] {
  return Object.keys(metadata.icons)
    .filter((id) => metadata.icons[id].c.includes(category))
    .sort((a, b) => a.localeCompare(b));
}

/** The canonical id a name stands for: itself, or its alias's target. */
export function canonicalIcon(metadata: LucideMetadata, id: string): string | null {
  if (metadata.icons[id]) return id;
  return metadata.aliases[id] ?? null;
}
