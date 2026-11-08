/**
 * A documentation page's frontmatter (JAVA-782): the YAML block between two `---` lines at the
 * very top of the text, which Officium's page schema requires (`doc-page-schema.md`).
 *
 * It is metadata, never content: the parser reads the body only, and the editor puts the block
 * back byte for byte on every save, so editing a page can never turn it into a rule and a heading.
 */
export interface Frontmatter {
  /** The block exactly as written, delimiters and the blank lines after it included. */
  raw: string;
  /** What it says: a scalar per key, or a list. Only the shapes the page schema allows. */
  data: Record<string, string | string[]>;
}

const OPEN = /^---[ \t]*\r?\n/;
const CLOSE = /^(?:---|\.\.\.)[ \t]*$/;
/** `key: value`, `key:`, a list item, an indented continuation, or a YAML comment. */
const YAML_LINE = /^(?:[A-Za-z_][\w-]*[ \t]*:(?:[ \t].*)?|[ \t]*-(?:[ \t].*)?|[ \t]+\S.*|[ \t]*#.*)$/;

/**
 * Splits a leading frontmatter block off the text. A text that merely OPENS with a rule (a card
 * whose first line is `---`) is not frontmatter: every line of the block must read as YAML and
 * the block must close, or the text comes back whole.
 */
export function splitFrontmatter(source: string): { frontmatter: Frontmatter | null; body: string } {
  const open = source.match(OPEN);
  if (!open) return { frontmatter: null, body: source };
  const lines = source.slice(open[0].length).split("\n");
  let consumed = open[0].length;
  const yaml: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].replace(/\r$/, "");
    if (CLOSE.test(line)) {
      consumed += lines[i].length + (i < lines.length - 1 ? 1 : 0);
      // The blank lines between the block and the body belong to the block: the body starts at
      // its first character, and the block is put back exactly as it was.
      for (let j = i + 1; j < lines.length - 1 && !lines[j].trim(); j += 1) consumed += lines[j].length + 1;
      if (!yaml.some((l) => l.trim())) return { frontmatter: null, body: source };
      const raw = source.slice(0, consumed);
      return { frontmatter: { raw, data: readYaml(yaml) }, body: source.slice(consumed) };
    }
    if (line.trim() && !YAML_LINE.test(line)) return { frontmatter: null, body: source };
    yaml.push(line);
    consumed += lines[i].length + 1;
  }
  return { frontmatter: null, body: source };
}

/**
 * The page schema's YAML, and nothing more: `key: scalar`, `key: [a, b]`, and `key:` followed by
 * `- item` lines. Quotes around a scalar are dropped. Anything richer (nested maps, multi-line
 * strings) is kept in `raw` untouched and simply not shown.
 */
export function readYaml(lines: string[]): Record<string, string | string[]> {
  const data: Record<string, string | string[]> = {};
  let listKey: string | null = null;
  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const item = line.match(/^[ \t]*-[ \t]*(.*)$/);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/);
    if (!pair) continue;
    const [, key, value] = pair;
    listKey = null;
    if (!value.trim()) {
      data[key] = [];
      listKey = key;
    } else if (/^\[.*\]$/.test(value.trim())) {
      data[key] = value
        .trim()
        .slice(1, -1)
        .split(",")
        .map((v) => unquote(v))
        .filter(Boolean);
    } else {
      data[key] = unquote(value);
    }
  }
  return data;
}

/** A quoted scalar keeps everything inside its quotes, `#` included; a bare one loses its comment. */
function unquote(value: string): string {
  const v = value.trim();
  const quoted = v.match(/^(["'])(.*)\1/);
  return quoted ? quoted[2] : v.replace(/[ \t]+#.*$/, "");
}
