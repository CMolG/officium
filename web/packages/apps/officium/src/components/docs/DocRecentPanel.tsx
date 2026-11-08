"use client";

import { useEffect, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Button, ShortcutKeys } from "@javadaba/ui";
import { FileText, History } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { docsPath } from "../../lib/backlog/search-links";
import type { DocRecent } from "../../lib/backlog/types";
import { relativeUpdated } from "../../lib/docs/relative-time";
import { useNow } from "../../lib/docs/use-now";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

const stateOf = (page: DocRecent) => (page.archivedAt ? "Archived" : page.published ? null : "Draft");

/**
 * The pages you opened last (JAVA-799): yours alone, newest first, at most 50. A page that was moved
 * still opens (the list holds its id), one in the trash drops out until it is restored. Loading, empty
 * (with what to do) and error (with Try again) are all drawn.
 */
export function DocRecentPanel({ projectId, repository, liveTick }: { projectId: string; repository: BacklogRepository; liveTick: number }) {
  const [pages, setPages] = useState<DocRecent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const now = useNow(30_000);

  useEffect(() => {
    let cancelled = false;
    repository.listRecentDocs(projectId).then(
      (next) => {
        if (cancelled) return;
        setPages(next);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, liveTick, attempt]);

  return (
    <section className="flex flex-col gap-4" aria-label="Recent pages" data-testid="doc-recent">
      <header className="flex flex-col gap-1 border-b border-[color:var(--jd-line)] pb-4">
        <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
          <History size={20} aria-hidden="true" /> Recent
        </h2>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">The pages you opened last. Only you see this list.</p>
      </header>
      {pages === null && error && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
          <p className="text-sm font-semibold">Couldn&apos;t load your recent pages</p>
          <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
          <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      )}
      {pages === null && !error && (
        <p role="status" className="text-sm text-[color:var(--jd-muted)]">
          Loading recent pages…
        </p>
      )}
      {pages !== null && pages.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
          <p className="text-sm font-semibold">You haven&apos;t opened a page yet</p>
          <p className="flex flex-row flex-wrap items-center gap-2 text-sm text-[color:var(--jd-muted)]">
            Open the command menu with <ShortcutKeys combo="Mod+K" /> to find one.
          </p>
        </div>
      )}
      {pages !== null && pages.length > 0 && (
        <ul className="flex flex-col gap-2">
          {pages.map((page) => (
            <li key={page.id} className="flex flex-col gap-0.5 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3" data-testid="doc-recent-row">
              <Link href={docsPath(projectId, page.path)} className="flex min-w-0 flex-row items-center gap-2 hover:underline">
                <FileText size={14} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate text-sm font-semibold">{page.title}</span>
              </Link>
              <p className="font-mono text-xs text-[color:var(--jd-muted)]">{page.path}</p>
              <p className="text-xs text-[color:var(--jd-muted)]">
                Opened <time dateTime={page.viewedAt}>{relativeUpdated(page.viewedAt, now)}</time>
                {stateOf(page) ? ` · ${stateOf(page)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
