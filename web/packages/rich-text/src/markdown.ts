import type { Extensions, JSONContent } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";

import { DETAILS_OPEN, SUMMARY_LINE, detailsClose } from "./doc-blocks";
import { markdownExtensions } from "./extensions";
import { splitFrontmatter } from "./frontmatter";

/**
 * Markdown in, Markdown out -- for the apps that store Markdown (Officium: its cards are written
 * by people in this editor and by agents through MCP, and both must read the same text).
 *
 * ONE manager and ONE extension list for the whole page: building a `MarkdownManager` compiles a
 * lexer, and the static renderer is handed the same list, so parsing and drawing can never
 * disagree about the schema.
 */
let schema: Extensions | undefined;
let manager: MarkdownManager | undefined;

export function markdownSchema(): Extensions {
  schema ??= markdownExtensions();
  return schema;
}

function markdown(): MarkdownManager {
  manager ??= new MarkdownManager({ extensions: markdownSchema() });
  return manager;
}

export const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * The text as a document. A leading frontmatter block is metadata, not content: it is left out
 * here, and `MarkdownEditor` puts it back on save (`splitFrontmatter`).
 */
export function parseMarkdown(source: string): JSONContent {
  return parseMarkdownBody(splitFrontmatter(source).body);
}

/**
 * Markdown with no frontmatter to set aside: what a person pastes into a page (JAVA-796). A
 * leading `---` there is a divider the person wrote, not metadata, so nothing is dropped.
 */
export function parseMarkdownBody(body: string): JSONContent {
  if (!body.trim()) return EMPTY_DOC;
  return markdown().parse(normalizeTaskItems(escapeHtmlTags(body)));
}

/**
 * `<name`, `</name`: the start of an HTML tag -- never an autolink, whose scheme has a colon --
 * unless it opens a `<kbd>key</kbd>` pair on the same line, which is kept (JAVA-782).
 */
const HTML_TAG = /(<kbd>[^<\n]+?<\/kbd>)|<(?=\/?[A-Za-z][A-Za-z0-9-]*(?:[\s/>]|$))/g;

/**
 * An HTML tag in a card's text is shown as the text it is, not interpreted.
 *
 * People and agents write about markup -- "the `<a>` of the skip link", "a second `<h1>`" --
 * and forget the backticks. Parsed as HTML, those tags vanished from the sentence or broke it
 * into empty blocks (11 of the 285 cards imported into Officium, 2026-09-23), and the schema
 * would have dropped any real HTML anyway. So outside code, `<` before a tag name becomes
 * `&lt;`: the reader sees `<a>`, and the serializer writes it back escaped, so the round trip
 * stays stable.
 *
 * The exceptions are exactly what Officium's page schema writes and the schema has a node for
 * (JAVA-782): a `<kbd>` pair on one line, and a `<details>` block whose opening and closing tags
 * are lines of their own and balance, with its `<summary>` line right after the opening one.
 * Anything else -- an unclosed `<details>`, a stray `<kbd>` -- is escaped like any other tag.
 */
export function escapeHtmlTags(source: string): string {
  const lines = source.split("\n");
  const kept = detailsLines(lines);
  let inFence = false;
  return lines
    .map((line, index) => {
      if (FENCE.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const role = kept.get(index);
      if (role === "tag") return line;
      if (role === "summary") return line.replace(/^(\s*<summary>)(.*)(<\/summary>\s*)$/, (_, open, inner, close) => `${open}${escapeLine(inner)}${close}`);
      return escapeLine(line);
    })
    .join("\n");
}

function escapeLine(line: string): string {
  // Odd parts are code spans: their `<` is already literal.
  return line
    .split(/(`+[^`]*`+)/)
    .map((part, index) => (index % 2 ? part : part.replace(HTML_TAG, (_, key: string | undefined) => key ?? "&lt;")))
    .join("");
}

/** The lines of balanced `<details>` blocks, outside code fences: their tags, and their summaries. */
function detailsLines(lines: readonly string[]): Map<number, "tag" | "summary"> {
  const kept = new Map<number, "tag" | "summary">();
  let inFence = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence || !DETAILS_OPEN.test(line)) return;
    const close = detailsClose(lines.slice(index));
    if (close < 0) return;
    kept.set(index, "tag");
    kept.set(index + close, "tag");
    if (SUMMARY_LINE.test(lines[index + 1] ?? "")) kept.set(index + 1, "summary");
  });
  return kept;
}

/** `- [ ]`/`- [x]`, and the backlog's own `- [~]` (partly done) and `- [-]` (dropped). */
const TASK_ITEM = /^(\s*)[-+*]\s+\[[ xX~-]\]\s+/;
/** A line that opens a block of its own, so it can never be the tail of the paragraph above. */
const BLOCK_START = /^\s*(?:[-+*]\s|\d+[.)]\s|```|~~~|>|#{1,6}\s|\|)/;
const FENCE = /^\s*(?:```|~~~)/;

const indentOf = (line: string) => line.length - line.trimStart().length;

/**
 * Rewrites checklist items so TipTap's checklist tokenizer reads them as a person meant them.
 *
 * That tokenizer takes an item's FIRST line as its text and block-parses every indented line
 * after it on its own, dedented by two spaces. So the way this repository's backlog wraps an item
 * -- continuation lines aligned under the text, six spaces in -- came out as an indented CODE
 * BLOCK, and a two-space continuation as a second paragraph (measured 2026-09-23 on the cards
 * imported into Officium). CommonMark says both are the same paragraph.
 *
 * Here, before parsing: a continuation line joins its item's line (a soft break reads as a
 * space anyway), and what really is nested -- a sub-list, a fence, a paragraph after a blank line
 * -- is shifted to exactly two spaces deeper than its item, which is where the tokenizer looks,
 * and normalised the same way, recursively.
 */
export function normalizeTaskItems(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let inFence = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (FENCE.test(line)) inFence = !inFence;
    const item = inFence ? null : line.match(TASK_ITEM);
    if (!item) {
      out.push(line);
      i += 1;
      continue;
    }
    const indent = item[1].length;
    let head = line.trimEnd();
    i += 1;
    while (i < lines.length && lines[i].trim() && indentOf(lines[i]) > indent && !BLOCK_START.test(lines[i])) {
      head = `${head} ${lines[i].trim()}`;
      i += 1;
    }
    out.push(head);

    const nested: string[] = [];
    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) {
        const following = lines.slice(i + 1).find((l) => l.trim());
        if (following === undefined || indentOf(following) <= indent) break;
      } else if (indentOf(next) <= indent) {
        break;
      }
      nested.push(next);
      i += 1;
    }
    if (nested.length) {
      const shallowest = Math.min(...nested.filter((l) => l.trim()).map(indentOf));
      const block = normalizeTaskItems(nested.map((l) => (l.trim() ? l.slice(shallowest) : "")).join("\n"));
      for (const l of block.split("\n")) out.push(l.trim() ? `${" ".repeat(indent + 2)}${l}` : "");
    }
  }
  return out.join("\n");
}

/** The document as Markdown; an empty document is the empty string, never a lone `&nbsp;`. */
export function serializeMarkdown(doc: JSONContent): string {
  if (isEmptyDocument(doc)) return "";
  return markdown().serialize(doc).replace(/\s+$/, "");
}

export function isEmptyDocument(doc: JSONContent): boolean {
  const blocks = doc.content ?? [];
  return blocks.every((block) => block.type === "paragraph" && !block.content?.length);
}

/**
 * The text a reader sees, one block per line -- for excerpts and for accessible names, where
 * `## Why` or `- [ ]` would be read out literally.
 */
export function markdownPlainText(source: string): string {
  const lines: string[] = [];
  const walk = (node: JSONContent): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    const inner: string = (node.content ?? []).map(walk).join("");
    if (["paragraph", "heading", "codeBlock", "tableCell", "tableHeader", "detailsSummary"].includes(node.type ?? "")) {
      lines.push(inner);
      return "";
    }
    return inner;
  };
  walk(parseMarkdown(source));
  return lines.filter((line) => line.trim()).join("\n");
}

/**
 * Would editing this Markdown in the visual editor keep it? Parsed, written back and parsed
 * again, it must be the SAME document -- measured on the 285 cards of this repository's own
 * backlog on 2026-09-23: 4 were not (strikethrough around inline code, a pipe inside a table
 * cell's code, a code fence inside a list item). The visual editor would have silently changed
 * those on the first save, so they open in Markdown instead.
 *
 * Soft line breaks and their indentation are not a difference: a wrapped line reads the same.
 */
export function keepsMarkdown(source: string): boolean {
  if (!source.trim()) return true;
  try {
    const doc = parseMarkdown(source);
    return sameDocument(doc, parseMarkdown(serializeMarkdown(doc)));
  } catch {
    return false;
  }
}

/**
 * Equal as documents: same blocks, marks and attributes. What a reader cannot see is not a
 * difference: whitespace in running text, the ORDER in which marks were applied (`**~~x~~**` and
 * `~~**x**~~` are one thing), a mark applied twice, or where one text run was split in two.
 */
export function sameDocument(a: JSONContent, b: JSONContent): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function canonical(node: JSONContent, inCode = false): JSONContent {
  const code = inCode || node.type === "codeBlock";
  if (node.type === "text") {
    const marks = [...new Map((node.marks ?? []).map((mark) => [JSON.stringify(mark), mark])).entries()]
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([, mark]) => mark);
    return {
      type: "text",
      text: code ? node.text : (node.text ?? "").replace(/\s+/g, " "),
      ...(marks.length ? { marks } : {}),
    };
  }
  if (!node.content) return node;
  const content: JSONContent[] = [];
  for (const child of node.content.map((c) => canonical(c, code))) {
    const previous = content.at(-1);
    if (previous?.type === "text" && child.type === "text" && JSON.stringify(previous.marks) === JSON.stringify(child.marks)) {
      const merged = `${previous.text}${child.text}`;
      content[content.length - 1] = { ...previous, text: code ? merged : merged.replace(/\s+/g, " ") };
    } else {
      content.push(child);
    }
  }
  return { ...node, content };
}
