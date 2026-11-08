import type { ChainedCommands, Editor, JSONContent, Range } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  ChevronRight, Heading1, Heading2, Heading3, Heading4, Info, Lightbulb, List, ListChecks, ListOrdered, MessageSquareWarning,
  OctagonAlert, Pilcrow, Quote, SquareCode, Table, TriangleAlert, Workflow, type LucideIcon,
} from "lucide-react";

import { ALERT_LABELS, type AlertKind } from "../doc-blocks";

/**
 * What the `/` menu and the `+` offer (JAVA-796): the page schema's blocks and nothing else, so a
 * person cannot make a page the lint then warns about. A host adds its own items after these (an
 * image, a file: JAVA-798).
 *
 * Left out on purpose: a divider. The schema reserves `---` for the frontmatter, so the menu never
 * offers one; typing `---` still makes one, as it always did.
 */
export interface BlockItem {
  id: string;
  label: string;
  /** What it makes, in a few words, under its name in the menu ("Draw it in text, see it live"). */
  description?: string;
  /** Other words a person may type after `/` to find it. */
  keywords: readonly string[];
  icon: LucideIcon;
  /** Makes the block the caret is in into this one. */
  apply: (chain: ChainedCommands) => ChainedCommands;
  /** Also offered by the selection toolbar's "Turn into" menu. */
  turnInto?: boolean;
}

/** The languages the page schema's lint accepts on a code fence (`DocLint.CODE_LANGUAGES`), `text` first. */
export const CODE_LANGUAGES = [
  "text", "bash", "console", "diff", "dockerfile", "http", "java", "js", "json", "mermaid", "powershell",
  "properties", "python", "sql", "toml", "ts", "tsx", "xml", "yaml",
] as const;

/** A diagram's accessible title and description come first, as the schema asks. */
const MERMAID_TEMPLATE = [
  "flowchart TD",
  "  accTitle: What the diagram is",
  "  accDescr: What it shows, in one sentence",
  "  A[Start] --> B[End]",
].join("\n");

/** Replaces the (empty) block holding the caret with `node`, and puts the caret `caret` positions in. */
function replaceBlock(node: JSONContent, caret: number) {
  return (chain: ChainedCommands) =>
    chain.command(({ tr, state, dispatch }) => {
      const { $from } = tr.selection;
      const from = $from.before($from.depth);
      const to = $from.after($from.depth);
      if (dispatch) {
        tr.replaceWith(from, to, state.schema.nodeFromJSON(node));
        tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(from + caret, tr.doc.content.size))));
      }
      return true;
    });
}

const heading = (level: 1 | 2 | 3 | 4, icon: LucideIcon): BlockItem => ({
  id: `heading${level}`,
  label: `Heading ${level}`,
  description: { 1: "A big section title", 2: "A section title", 3: "A subsection title", 4: "A small title" }[level],
  keywords: [`h${level}`, "title", "heading"],
  icon,
  apply: (c) => c.setHeading({ level }),
  turnInto: true,
});

const ALERT_ICONS: Record<AlertKind, LucideIcon> = {
  NOTE: Info,
  TIP: Lightbulb,
  IMPORTANT: MessageSquareWarning,
  WARNING: TriangleAlert,
  CAUTION: OctagonAlert,
};

const ALERT_DESCRIPTIONS: Record<AlertKind, string> = {
  NOTE: "Something worth keeping in mind",
  TIP: "A hint that saves time",
  IMPORTANT: "What must not be missed",
  WARNING: "Something that can go wrong",
  CAUTION: "Something that can do harm",
};

const alert = (kind: AlertKind): BlockItem => ({
  id: `alert-${kind.toLowerCase()}`,
  label: ALERT_LABELS[kind],
  description: ALERT_DESCRIPTIONS[kind],
  keywords: ["notice", "callout", "alert", kind.toLowerCase()],
  icon: ALERT_ICONS[kind],
  apply: (c) => c.wrapIn("alert", { kind }),
});

export const DEFAULT_BLOCK_ITEMS: readonly BlockItem[] = [
  { id: "paragraph", label: "Text", description: "Plain writing", keywords: ["paragraph", "plain"], icon: Pilcrow, apply: (c) => c.setParagraph(), turnInto: true },
  heading(1, Heading1),
  heading(2, Heading2),
  heading(3, Heading3),
  heading(4, Heading4),
  { id: "bulletList", label: "Bulleted list", description: "A simple list", keywords: ["ul", "bullet", "list"], icon: List, apply: (c) => c.toggleBulletList(), turnInto: true },
  { id: "orderedList", label: "Numbered list", description: "A list in order", keywords: ["ol", "ordered", "number", "list"], icon: ListOrdered, apply: (c) => c.toggleOrderedList(), turnInto: true },
  { id: "taskList", label: "Task list", description: "Check things off", keywords: ["todo", "checkbox", "check", "list"], icon: ListChecks, apply: (c) => c.toggleTaskList(), turnInto: true },
  { id: "table", label: "Table", description: "Rows and columns", keywords: ["grid", "columns"], icon: Table, apply: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { id: "codeBlock", label: "Code block", description: "Code with its language", keywords: ["code", "fence", "snippet", ...CODE_LANGUAGES], icon: SquareCode, apply: (c) => c.setCodeBlock({ language: "text" }), turnInto: true },
  alert("NOTE"),
  alert("TIP"),
  alert("IMPORTANT"),
  alert("WARNING"),
  alert("CAUTION"),
  {
    id: "details",
    label: "Disclosure",
    description: "Hide the detail until it is opened",
    keywords: ["details", "summary", "collapse", "toggle", "faq"],
    icon: ChevronRight,
    apply: replaceBlock({ type: "details", content: [{ type: "detailsSummary" }, { type: "paragraph" }] }, 2),
  },
  {
    id: "mermaid",
    label: "Mermaid diagram",
    description: "Draw it in text, see it live",
    keywords: ["diagram", "flowchart", "chart", "graph"],
    icon: Workflow,
    apply: replaceBlock({ type: "codeBlock", attrs: { language: "mermaid" }, content: [{ type: "text", text: MERMAID_TEMPLATE }] }, 1),
  },
  { id: "blockquote", label: "Quote", description: "Set a passage apart", keywords: ["blockquote", "citation"], icon: Quote, apply: (c) => c.toggleBlockquote(), turnInto: true },
];

/** Whether the item can apply where the caret is (a heading inside a table cell cannot, for one). */
export function canApply(editor: Editor, item: BlockItem): boolean {
  return item.apply(editor.can().chain().focus()).run();
}

/** Applies the item, first deleting what was typed to find it (`range`, the `/query`). */
export function applyBlockItem(editor: Editor, item: BlockItem, range: Range | null): void {
  const chain = editor.chain().focus();
  item.apply(range ? chain.deleteRange(range) : chain).run();
}

/** The items whose name or keywords start with what was typed; the name's own matches first. */
export function filterBlockItems(items: readonly BlockItem[], query: string): BlockItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  const words = (text: string) => text.toLowerCase().split(/\s+/);
  const byLabel = items.filter((item) => words(item.label).some((w) => w.startsWith(q)) || item.label.toLowerCase().startsWith(q));
  const byKeyword = items.filter((item) => !byLabel.includes(item) && item.keywords.some((k) => k.startsWith(q)));
  return [...byLabel, ...byKeyword];
}
