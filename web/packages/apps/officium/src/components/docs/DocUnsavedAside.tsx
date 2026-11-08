"use client";

import { MarkdownView } from "@javadaba/rich-text";

/** What a person typed that the page no longer holds, kept beside it to copy from (JAVA-796). */
export function DocUnsavedAside({ body, title, className }: { body: string; title?: string; className?: string }) {
  return (
    <aside aria-label="Your unsaved version" className={`flex flex-col gap-2 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-control-border)] p-4 ${className ?? ""}`}>
      {title !== undefined && (
        <>
          <p className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Your unsaved version, to copy from</p>
          <p className="text-sm font-semibold">{title}</p>
        </>
      )}
      <MarkdownView markdown={body} className="text-sm leading-relaxed" />
    </aside>
  );
}
