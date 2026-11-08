"use client";

import { Button } from "@javadaba/ui";

import type { SearchFailure } from "../../lib/docs/use-doc-search";

/** A search that failed (JAVA-800): what happened, why, and a way out. Offline says the query is kept. */
export function DocSearchFailure({ failure, onRetry }: { failure: SearchFailure; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6" data-testid="doc-search-error">
      <p className="text-sm font-semibold">{failure.offline ? "You're offline" : "Couldn't search the pages"}</p>
      <p className="text-sm text-[color:var(--jd-muted)]">
        {failure.offline ? "Search needs the connection. Your search is kept: try again when you are back." : failure.message}
      </p>
      <Button type="button" register="ui" variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
