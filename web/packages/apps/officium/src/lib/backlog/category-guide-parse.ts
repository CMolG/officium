import type { Category } from "./types";

/**
 * A category's guide as sections (JAVA-518, to JAVA-516's design): `category-guide.json`'s
 * description is Markdown with fixed headings -- a definition, then `**Signals.**`,
 * `**Excludes.**`, `**Entry contract.**`, `**Exit contract.**` and `**Behavior.**` -- and the
 * category sheet and its info modal draw each one as its own block instead of rendering the blob.
 *
 * Pure, with type-only imports, so `scripts/test/officium-category-guide-parse.test.mjs` runs it
 * under plain `node --test` against all fifteen entries.
 */
export interface ParsedGuide {
  definition: string;
  /** Tags, so without the paragraph's closing period. */
  signals: string[];
  /** Each sentence saying where a look-alike belongs instead. */
  excludes: string[];
  entry: string[];
  exit: string[];
  behavior: string[];
}

const SECTIONS = {
  "Signals.": "signals",
  "Excludes.": "excludes",
  "Entry contract.": "entry",
  "Exit contract.": "exit",
  "Behavior.": "behavior",
} as const;

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, " ").trim();

/** A section's body as items: its `- ` list, else the paragraph as a single item. */
function items(body: string): string[] {
  if (!/^- /m.test(body)) return body ? [oneLine(body)] : [];
  return body
    .split(/^- /m)
    .map(oneLine)
    .filter(Boolean);
}

/** Throws on a heading it doesn't know: a guide that grew a section must not lose it silently. */
export function parseGuide(description: string): ParsedGuide {
  const guide: ParsedGuide = { definition: "", signals: [], excludes: [], entry: [], exit: [], behavior: [] };
  const [definition, ...chunks] = description.trim().split(/\n\s*\n/);
  guide.definition = oneLine(definition);
  for (const chunk of chunks) {
    const heading = /^\*\*([^*]+)\*\*\s*([\s\S]*)$/.exec(chunk.trim());
    const key = heading ? SECTIONS[heading[1] as keyof typeof SECTIONS] : undefined;
    if (!heading || !key) throw new Error(`Unknown section in a category guide: ${chunk.slice(0, 40)}`);
    const body = heading[2].trim();
    guide[key] =
      key === "signals"
        ? oneLine(body)
            .replace(/\.$/, "")
            .split("·")
            .map((s) => s.trim())
            .filter(Boolean)
        : items(body);
  }
  return guide;
}

/** The categories an exclude sentence sends a card to, by name ("a user story") or by id
 *  (`technicalDebt`), in the order given, never `self`. Only a name right after `is`, `a` or `an`
 *  counts: that is where a sentence sends the card ("is technicalDebt", "as a documentation card"),
 *  while a name used as an ordinary noun ("data or infrastructure updated") sends it nowhere. */
export function namedCategories(sentence: string, labels: Readonly<Record<Category, string>>, self: Category): Category[] {
  return (Object.keys(labels) as Category[]).filter((id) => {
    if (id === self) return false;
    const words = new RegExp(`\\b(?:is|an?)\\s+(?:${escape(labels[id])}|${escape(id)})\\b`, "i");
    return words.test(sentence);
  });
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
