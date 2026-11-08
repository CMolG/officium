"use client";

import type { ReactNode } from "react";
import type { MarkdownHeading } from "@javadaba/rich-text";

import { DocContents } from "./DocContents";
import { DocSidePanel } from "./DocSidePanel";

/**
 * The side of a page (JAVA-795, JAVA-1537): its history or its contents, one at a time -- they share the column. The
 * contents shows from `lg` up when it is switched on and the page has headings. Comments are not here: they sit at
 * the end of the page and on their passages (JAVA-1538).
 */
export function DocReadingAside({ headings, contentsShown, history, onCloseHistory, onJump }: {
  headings: MarkdownHeading[];
  contentsShown: boolean;
  /** The history panel while History is on. */
  history: ReactNode;
  onCloseHistory: () => void;
  onJump: (id: string) => void;
}) {
  if (history) {
    return (
      <DocSidePanel label="History" testId="doc-history-panel" onClose={onCloseHistory}>
        {history}
      </DocSidePanel>
    );
  }
  return contentsShown && headings.length > 0 ? <DocContents headings={headings} onJump={onJump} /> : null;
}
