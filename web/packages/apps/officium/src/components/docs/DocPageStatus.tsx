"use client";

import { FileQuestion } from "lucide-react";
import { Button, LoadingRegion, Skeleton } from "@javadaba/ui";

/** What a documentation page shows while it has no page to show: loading, a failed first load, or no page at the path. */
export function DocPageStatus({
  state,
  path,
  error,
  onRetry,
}: {
  state: "loading" | "error" | "missing";
  path: string;
  error: string | null;
  onRetry: () => void;
}) {
  if (state === "loading") {
    return (
      <LoadingRegion
        loading
        label="Loading the page…"
        className="flex flex-col gap-3"
        fallback={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton shape="block" className="h-8 w-2/3" />
            <Skeleton shape="block" className="h-24 w-full" />
          </div>
        }
      />
    );
  }

  if (state === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
        <p className="text-sm font-semibold">Couldn&apos;t load this page</p>
        <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
      <FileQuestion size={20} className="text-[color:var(--jd-muted)]" aria-hidden="true" />
      <p className="text-sm font-semibold">No page at {path}</p>
      <p className="text-sm text-[color:var(--jd-muted)]">
        It may have been renamed or deleted. Pick another page from the list.
      </p>
    </div>
  );
}
