"use client";

import { LoadingRegion, Skeleton } from "@javadaba/ui";

/** A Configuration page while it loads: the rows of what is coming as shapes, never a "Loading…" line (Cfg-*, States). */
export function ConfigLoading({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <LoadingRegion
      loading
      label={label}
      fallbackClassName=""
      fallback={
        <div className="flex flex-col gap-3" data-testid="config-loading">
          {Array.from({ length: rows }, (_, index) => (
            <Skeleton key={index} shape="block" className="h-14 w-full" />
          ))}
        </div>
      }
    />
  );
}
