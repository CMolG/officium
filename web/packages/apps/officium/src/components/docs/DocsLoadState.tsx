"use client";

import { Button } from "@javadaba/ui";

/** The documentation before its tree arrives: loading, or what failed with a way to try again. */
export function DocsLoadState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (!error) {
    return (
      <p role="status" className="text-sm text-[color:var(--jd-muted)]">
        Loading pages…
      </p>
    );
  }
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
      <p className="text-sm font-semibold">Couldn&apos;t load the documentation</p>
      <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
      <Button type="button" register="ui" variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
