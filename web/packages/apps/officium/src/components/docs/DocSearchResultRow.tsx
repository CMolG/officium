"use client";

import { Link } from "@javadaba/ui/navigation";
import { FileText } from "lucide-react";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocSearchResult } from "../../lib/backlog/types";
import { relativeUpdated } from "../../lib/docs/relative-time";

const stateOf = (page: DocSearchResult) => (page.archivedAt ? "Archived" : page.published ? null : "Unpublished");

/**
 * One search result: the title as the link, the path, who updated it and when, its state in words, and the
 * excerpt. The excerpt arrives as parts and is drawn as text, so markup in a page body never becomes markup
 * here; a hit is `<mark>` and also semibold, because colour is never the only channel.
 */
export function DocSearchResultRow({ projectId, page, now }: { projectId: string; page: DocSearchResult; now: number }) {
  const state = stateOf(page);
  return (
    <li className="flex flex-col gap-1 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3" data-testid="doc-search-row">
      <Link href={docsPath(projectId, page.path)} className="flex min-w-0 flex-row items-center gap-2 hover:underline">
        <FileText size={14} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-semibold">{page.title}</span>
      </Link>
      <p className="font-mono text-xs text-[color:var(--jd-muted)]">{page.path}</p>
      {page.snippet.length > 0 && (
        <p className="text-sm text-[color:var(--jd-muted)]" data-testid="doc-search-snippet">
          {page.snippet.map((part, index) =>
            part.match ? (
              <mark key={index} className="rounded-sm bg-[color:var(--jd-accent-soft,transparent)] font-semibold text-[color:var(--jd-ink)]">
                {part.text}
              </mark>
            ) : (
              <span key={index}>{part.text}</span>
            ),
          )}
        </p>
      )}
      <p className="text-xs text-[color:var(--jd-muted)]">
        Updated <time dateTime={page.updatedAt}>{relativeUpdated(page.updatedAt, now)}</time> by {page.updatedBy.name}
        {state ? ` · ${state}` : ""}
      </p>
    </li>
  );
}
