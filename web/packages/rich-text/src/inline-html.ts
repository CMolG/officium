import { Mark, Node as TipTapNode, mergeAttributes, type Extensions, type JSONContent } from "@tiptap/core";

const InlineDocument = TipTapNode.create({ name: "doc", topNode: true, content: "paragraph" });
const InlineParagraph = TipTapNode.create({
  name: "paragraph",
  content: "inline*",
  parseHTML: () => [{ tag: "p" }],
  renderHTML: () => ["p", 0],
});
const InlineText = TipTapNode.create({ name: "text", group: "inline" });

/** What one inline field keeps from the HTML it opens with. */
export const LINK_ATTRIBUTES = ["href", "style", "class", "target", "title", "rel"] as const;

/** A variable the person inserts, drawn as one atom: its source (`{name}`) is kept as written. */
export const InlineToken = TipTapNode.create({
  name: "token",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { expr: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "span[data-token]", getAttrs: (el) => ({ expr: (el as HTMLElement).getAttribute("data-token") ?? "" }) }];
  },
  renderHTML({ node }) {
    const expr = String(node.attrs.expr);
    return ["span", { "data-token": expr, class: "jd-token", contenteditable: "false" }, expr.replace(/^\{|\}$/g, "")];
  },
});

export const InlineBreak = TipTapNode.create({
  name: "hardBreak",
  group: "inline",
  inline: true,
  selectable: false,
  parseHTML: () => [{ tag: "br" }],
  renderHTML: () => ["br"],
});

/** Bold and italic keep the tag they were written with (`b` or `strong`). */
function tagMark(name: string, tags: [string, string], fallback: string) {
  return Mark.create({
    name,
    addAttributes() {
      return { tag: { default: fallback, rendered: false } };
    },
    parseHTML() {
      return tags.map((tag) => ({ tag, getAttrs: (el: HTMLElement | string) => ({ tag: (el as HTMLElement).tagName.toLowerCase() }) }));
    },
    renderHTML({ mark }) {
      return [String(mark.attrs.tag), 0];
    },
  });
}

export const InlineBold = tagMark("bold", ["strong", "b"], "strong");
export const InlineItalic = tagMark("italic", ["em", "i"], "em");

export const InlineLink = Mark.create({
  name: "link",
  inclusive: false,
  addAttributes() {
    return Object.fromEntries(LINK_ATTRIBUTES.map((name) => [name, { default: null }]));
  },
  parseHTML() {
    return [{ tag: "a" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", mergeAttributes(HTMLAttributes), 0];
  },
});


/** The schema of an inline field: one paragraph of text, breaks, chips, bold, italic and links. */
export function inlineExtensions(): Extensions {
  return [
    InlineDocument,
    InlineParagraph,
    InlineText,
    InlineBreak,
    InlineToken,
    InlineBold,
    InlineItalic,
    InlineLink,
  ];
}

const MARK_ORDER = ["link", "bold", "italic"];

function open(mark: { type: string; attrs?: Record<string, unknown> }): string {
  if (mark.type === "bold" || mark.type === "italic") return `<${String(mark.attrs?.tag)}>`;
  const attrs = LINK_ATTRIBUTES.filter((name) => mark.attrs?.[name] != null && mark.attrs[name] !== "")
    .map((name) => ` ${name}="${escapeAttr(String(mark.attrs?.[name]))}"`)
    .join("");
  return `<a${attrs}>`;
}

const close = (mark: { type: string; attrs?: Record<string, unknown> }) =>
  mark.type === "link" ? "</a>" : `</${String(mark.attrs?.tag)}>`;

const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/ /g, "&nbsp;");

export interface SerializeOptions {
  /** Applied to each text node, already HTML-escaped, and to nothing else (not to chips). */
  escapeText?: (escaped: string) => string;
}

type Marks = { type: string; attrs?: Record<string, unknown> }[];

/** The field's inline HTML. Walks the document itself: `getHTML` would rewrite more than it keeps. */
export function serializeInlineHtml(doc: JSONContent, options: SerializeOptions = {}): string {
  const escapeText = options.escapeText ?? ((s: string) => s);
  const children = doc.content?.[0]?.content ?? [];
  let out = "";
  let stack: Marks = [];
  for (const node of children) {
    const marks = ([...(node.marks ?? [])] as Marks).sort(
      (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
    );
    let keep = 0;
    while (keep < stack.length && keep < marks.length && JSON.stringify(stack[keep]) === JSON.stringify(marks[keep])) keep++;
    for (let i = stack.length - 1; i >= keep; i--) out += close(stack[i]);
    for (let i = keep; i < marks.length; i++) out += open(marks[i]);
    stack = marks;
    if (node.type === "text") out += escapeText(escapeHtml(node.text ?? ""));
    else if (node.type === "hardBreak") out += "<br>";
    else if (node.type === "token") out += String(node.attrs?.expr ?? "");
  }
  for (let i = stack.length - 1; i >= 0; i--) out += close(stack[i]);
  return out;
}
