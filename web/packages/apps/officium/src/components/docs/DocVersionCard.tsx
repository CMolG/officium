"use client";

import { MarkdownView } from "@javadaba/rich-text";

export function VersionCard({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4">
      <p className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">{label}</p>
      <p className="text-sm font-semibold">{title}</p>
      {body.trim() ? (
        <MarkdownView markdown={body} className="text-sm leading-relaxed" />
      ) : (
        <p className="text-sm text-[color:var(--jd-muted)]">No text.</p>
      )}
    </div>
  );
}
