"use client";

import { useEffect, useState } from "react";
import { Button } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPageSummary } from "../../lib/backlog/types";
import { docsPath } from "../../lib/backlog/search-links";

/**
 * "Referenced by" (JAVA-792): the pages whose links point here, directly or through a path that moved to
 * this page. Absent when nothing links here, and a quiet line while it loads. It re-reads with the page,
 * since any page's edit can add or remove a link.
 */
export function DocBacklinks({
  projectId,
  path,
  repository,
  liveTick,
}: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  liveTick: number;
}) {
  const [pages, setPages] = useState<DocPageSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    repository.getDocBacklinks(projectId, path).then(
      (next) => {
        if (cancelled) return;
        setPages(next.pages);
        setFailed(false);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, path, repository, liveTick, attempt]);

  if (failed && pages === null) {
    return (
      <section aria-label="Referenced by" className="flex flex-col items-start gap-2 border-t border-[color:var(--jd-line)] pt-4">
        <p role="alert" className="text-sm text-[color:var(--jd-muted)]">
          Couldn&apos;t load the pages that link here.
        </p>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </section>
    );
  }
  if (pages === null) {
    return (
      <p role="status" className="border-t border-[color:var(--jd-line)] pt-4 text-xs text-[color:var(--jd-muted)]">
        Looking for pages that link here…
      </p>
    );
  }
  if (pages.length === 0) return null;
  return (
    <section aria-label="Referenced by" className="flex flex-col gap-1 border-t border-[color:var(--jd-line)] pt-4" data-testid="doc-backlinks">
      <h3 className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Referenced by</h3>
      <ul className="flex flex-col">
        {pages.map((page) => (
          <li key={page.path}>
            <Link
              href={docsPath(projectId, page.path)}
              className="flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)] px-2 text-sm hover:bg-[color:var(--jd-ink)]/[0.06]"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
