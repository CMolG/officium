import { Mark, Node, mergeAttributes, type JSONContent, type MarkdownToken } from "@tiptap/core";

/**
 * What Officium's page schema writes beyond CommonMark (JAVA-782): GitHub alerts, collapsible
 * `<details>` and `<kbd>` keys. Each one parses to its own node or mark and serialises back to the
 * same text, so a page written to the schema survives being edited (`doc-page-schema.md`).
 *
 * Exactly these three HTML elements are understood; every other tag stays escaped
 * (`escapeHtmlTags`), so a sentence ABOUT markup still reads as written.
 */

export const ALERT_KINDS = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

/** The word a reader sees: the kind is said in text, never by colour alone. */
export const ALERT_LABELS: Record<AlertKind, string> = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
};

const ALERT_OPEN = new RegExp(`^ {0,3}>[ \\t]?\\[!(${ALERT_KINDS.join("|")})\\][ \\t]*(?:\\n|$)`, "i");
const QUOTE_LINE = /^ {0,3}>[ \t]?(.*)$/;

const isAlertKind = (value: unknown): value is AlertKind =>
  typeof value === "string" && (ALERT_KINDS as readonly string[]).includes(value);

/**
 * `> [!WARNING]` followed by the quote's lines. GitHub's marker is alone on the first line; a
 * lowercase marker is read too and written back uppercase (the one normalisation).
 */
export const Alert = Node.create({
  name: "alert",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "NOTE",
        parseHTML: (element) => {
          const kind = element.getAttribute("data-alert")?.toUpperCase();
          return isAlertKind(kind) ? kind : "NOTE";
        },
        renderHTML: (attributes) => ({ "data-alert": String(attributes.kind).toLowerCase() }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-alert]", contentElement: "div[data-alert-body]" }];
  },

  // The editor's drawing; `MarkdownView` draws its own (`AlertView`).
  renderHTML({ node, HTMLAttributes }) {
    const kind = isAlertKind(node.attrs.kind) ? node.attrs.kind : "NOTE";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "jd-alert", role: "note" }),
      ["p", { class: "jd-alert-title", contenteditable: "false" }, ALERT_LABELS[kind]],
      ["div", { "data-alert-body": "", class: "jd-alert-body" }, 0],
    ];
  },

  markdownTokenizer: {
    name: "alert",
    level: "block",
    start: (src: string) => src.search(new RegExp(ALERT_OPEN.source, "im")),
    tokenize(src, _tokens, lexer) {
      const open = src.match(ALERT_OPEN);
      if (!open) return undefined;
      let consumed = open[0].length;
      const body: string[] = [];
      for (const line of src.slice(consumed).split("\n")) {
        const quoted = line.match(QUOTE_LINE);
        if (!quoted) break;
        body.push(quoted[1]);
        consumed += line.length + 1;
      }
      return {
        type: "alert",
        raw: src.slice(0, Math.min(consumed, src.length)),
        kind: open[1].toUpperCase(),
        tokens: lexer.blockTokens(body.join("\n")),
      };
    },
  },

  parseMarkdown(token: MarkdownToken, helpers) {
    const content = helpers.parseChildren(token.tokens ?? []);
    return helpers.createNode("alert", { kind: token.kind }, content.length ? content : [{ type: "paragraph" }]);
  },

  renderMarkdown(node: JSONContent, helpers) {
    const kind = isAlertKind(node.attrs?.kind) ? node.attrs.kind : "NOTE";
    const body = helpers.renderChildren(node.content ?? [], "\n\n");
    const lines = body.split("\n").map((line) => (line.trim() ? `> ${line}` : ">"));
    return [`> [!${kind}]`, ...lines].join("\n");
  },
});

export const DETAILS_OPEN = /^ {0,3}<details( open)?>[ \t]*$/;
const DETAILS_CLOSE = /^ {0,3}<\/details>[ \t]*$/;
export const SUMMARY_LINE = /^ {0,3}<summary>(.*)<\/summary>[ \t]*$/;
const FENCE = /^\s*(?:```|~~~)/;

/**
 * The line index of the `</details>` that closes the `<details>` on line 0, or -1. Nested
 * `<details>` count, and nothing inside a code fence does.
 */
export function detailsClose(lines: readonly string[]): number {
  let depth = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    if (DETAILS_OPEN.test(line)) depth += 1;
    else if (DETAILS_CLOSE.test(line)) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** `<summary>` -- the always-visible line of a `<details>`. Inline text only. */
export const DetailsSummary = Node.create({
  name: "detailsSummary",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "summary" }, { tag: "div[data-type='detailsSummary']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "detailsSummary", class: "jd-details-summary" }), 0];
  },
});

/**
 * `<details>`, its optional `<summary>` line, then Markdown, then `</details>`, each tag on its own
 * line (the shape of the page schema's FAQ). Written back with the blank lines GitHub needs to
 * read the body as Markdown.
 *
 * In the editor it is drawn open, as a framed block: a collapsed `<details>` would hide what is
 * being edited. `data-open` keeps whether it opens collapsed for readers.
 */
export const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary? block*",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: false,
        parseHTML: (element) =>
          element.hasAttribute("data-open") ? element.getAttribute("data-open") === "true" : element.hasAttribute("open"),
        renderHTML: (attributes) => ({ "data-open": attributes.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "details" }, { tag: "div[data-type='details']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "details", class: "jd-details" }), 0];
  },

  markdownTokenizer: {
    name: "details",
    level: "block",
    start: (src: string) => src.search(new RegExp(DETAILS_OPEN.source, "m")),
    tokenize(src, _tokens, lexer) {
      const lines = src.split("\n");
      const open = lines[0].match(DETAILS_OPEN);
      if (!open) return undefined;
      const close = detailsClose(lines);
      if (close < 0) return undefined;
      let inner = lines.slice(1, close);
      const summary = inner[0]?.match(SUMMARY_LINE);
      if (summary) inner = inner.slice(1);
      const raw = lines.slice(0, close + 1).join("\n") + (close < lines.length - 1 ? "\n" : "");
      return {
        type: "details",
        raw,
        open: Boolean(open[1]),
        summary: summary ? lexer.inlineTokens(summary[1]) : null,
        tokens: lexer.blockTokens(inner.join("\n")),
      };
    },
  },

  parseMarkdown(token: MarkdownToken, helpers) {
    const content: JSONContent[] = [];
    if (token.summary) content.push(helpers.createNode("detailsSummary", undefined, helpers.parseInline(token.summary)));
    content.push(...helpers.parseChildren(token.tokens ?? []));
    return helpers.createNode("details", { open: token.open }, content);
  },

  renderMarkdown(node: JSONContent, helpers) {
    const children = node.content ?? [];
    const summary = children[0]?.type === "detailsSummary" ? children[0] : null;
    const blocks = summary ? children.slice(1) : children;
    const head = `<details${node.attrs?.open ? " open" : ""}>${summary ? `\n<summary>${helpers.renderChildren(summary.content ?? [])}</summary>` : ""}`;
    const body = blocks.length ? helpers.renderChildren(blocks, "\n\n") : "";
    return body ? `${head}\n\n${body}\n\n</details>` : `${head}\n\n</details>`;
  },
});

const KBD = /^<kbd>([^<\n]*?)<\/kbd>/;

/** `<kbd>Ctrl</kbd>`: one key. The schema joins keys with `+` between two of these. */
export const Kbd = Mark.create({
  name: "kbd",
  parseHTML() {
    return [{ tag: "kbd" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["kbd", HTMLAttributes, 0];
  },
  markdownTokenizer: {
    name: "kbd",
    level: "inline",
    start: (src: string) => src.indexOf("<kbd>"),
    tokenize(src, _tokens, lexer) {
      const match = KBD.exec(src);
      if (!match || !match[1]) return undefined;
      return { type: "kbd", raw: match[0], text: match[1], tokens: lexer.inlineTokens(match[1]) };
    },
  },
  parseMarkdown(token: MarkdownToken, helpers) {
    return helpers.applyMark("kbd", helpers.parseInline(token.tokens ?? []));
  },
  renderMarkdown(node: JSONContent, helpers) {
    return `<kbd>${helpers.renderChildren(node)}</kbd>`;
  },
});
