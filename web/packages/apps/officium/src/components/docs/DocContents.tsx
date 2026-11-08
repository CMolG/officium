import type { MarkdownHeading } from "@javadaba/rich-text";

import { DocContentsList } from "./DocContentsList";

/**
 * The contents beside the page from `lg` up (JAVA-795). It holds its place while the text scrolls and scrolls its own
 * list when the headings outgrow the pane (JAVA-1535).
 */
export function DocContents({ headings, onJump }: { headings: MarkdownHeading[]; onJump: (id: string) => void }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col pb-6 lg:flex lg:min-h-0" data-testid="doc-contents">
      <p className="px-2 pb-1 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Contents</p>
      <DocContentsList headings={headings} onJump={onJump} fill />
    </aside>
  );
}
