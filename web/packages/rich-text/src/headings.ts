import type { JSONContent } from "@tiptap/core";

import { parseMarkdown, markdownPlainText } from "./markdown";

export interface MarkdownHeading {
  level: number;
  text: string;
  /** The anchor the view draws on the heading, so a contents list and the page cannot disagree. */
  id: string;
  /** Inside a `<details>`: a jump there would land on hidden text. */
  inDetails: boolean;
}

const MAX_SLUG = 64;

/** `h-` plus a slug: NFKD, marks stripped, runs of anything outside `[a-z0-9]` become one `-`. */
export function headingSlug(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/g, "");
  return `h-${slug || "section"}`;
}

function textOf(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(textOf).join("");
}

/**
 * Hands out heading ids in document order: a repeated slug takes `-2`, `-3`. One allocator per
 * walk, shared by the read view and the editor (JAVA-796), so the contents panel jumps to the same
 * anchor whichever of the two draws the page.
 */
export function headingIdAllocator(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = headingSlug(text);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

/** Every heading of the body in document order; a repeated slug takes `-2`, `-3`. */
export function markdownHeadings(source: string): MarkdownHeading[] {
  const found: MarkdownHeading[] = [];
  const idFor = headingIdAllocator();
  const walk = (node: JSONContent, inDetails: boolean) => {
    if (node.type === "heading") {
      const text = textOf(node).trim();
      found.push({ level: Number(node.attrs?.level ?? 1), text, id: idFor(text), inDetails });
    }
    const nested = inDetails || node.type === "details";
    for (const child of node.content ?? []) walk(child, nested);
  };
  walk(parseMarkdown(source), false);
  return found;
}

/** Words in what a reader sees (the frontmatter is left out). */
export function markdownWordCount(source: string): number {
  const text = markdownPlainText(source).trim();
  return text ? text.split(/\s+/).length : 0;
}
