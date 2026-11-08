"use client";

import type { Editor, JSONContent } from "@tiptap/core";
import { useRef, useState } from "react";

import { splitFrontmatter } from "./frontmatter";
import { sameDocument, serializeMarkdown } from "./markdown";

/**
 * The one rule both Markdown editors keep (the card field and the page, JAVA-796): **untouched
 * means untouched.** While the document is the one it opened with, the editor hands back the
 * ORIGINAL text, not a re-serialisation of it, so opening a page an agent wrote and leaving
 * cannot rewrite it. A leading frontmatter block is not in the document: it goes back in front,
 * byte for byte.
 */
export function useMarkdownDocument(initial: string, onMarkdown: (markdown: string) => void) {
  // The document exactly as the editor normalised it on load: "unchanged" is measured against
  // THIS, not against the parser's output, which carries no default attributes.
  const baseline = useRef<JSONContent | null>(null);
  // ...and the text it was loaded from. Fixed until `reset`: reading a prop there would make "undo
  // back to the original" answer the last edited text instead of the original one.
  const original = useRef(initial);
  const [frontmatter, setFrontmatter] = useState(() => splitFrontmatter(initial).frontmatter?.raw ?? "");
  const front = useRef(frontmatter);

  return {
    /** The frontmatter kept aside, for the notice that says it is kept. */
    frontmatter,
    onCreate: ({ editor }: { editor: Editor }) => {
      baseline.current = editor.getJSON();
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      const json = editor.getJSON();
      onMarkdown(baseline.current && sameDocument(json, baseline.current) ? original.current : `${front.current}${serializeMarkdown(json)}`);
    },
    /** A newer saved text replaced the document (another writer): untouched now means THAT text. */
    reset: (markdown: string, editor: Editor) => {
      original.current = markdown;
      front.current = splitFrontmatter(markdown).frontmatter?.raw ?? "";
      setFrontmatter(front.current);
      baseline.current = editor.getJSON();
    },
  };
}
