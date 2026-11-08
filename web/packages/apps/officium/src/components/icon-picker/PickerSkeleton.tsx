"use client";

import { Skeleton, Text } from "@javadaba/ui";

/**
 * The stand-in for a picker still loading: the rows the loaded picker draws, at their heights, so the dialog
 * keeps its size when the real rows arrive (JAVA-1765). `header` adds the tabs and the search row, which the
 * loader's panel draws itself once its own chunk is in.
 */
export function PickerSkeleton({ label, header = false }: { label: string; header?: boolean }) {
  return (
    <>
      {header && (
        <>
          <Skeleton className="h-13 w-40 shrink-0" />
          <Skeleton className="h-11 shrink-0" />
        </>
      )}
      <div className="flex shrink-0 flex-row gap-1 overflow-x-auto">
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="size-11 shrink-0" />
        ))}
      </div>
      <Text as="h3" size="xs" tone="muted" className="shrink-0">
        {label}
      </Text>
      <div aria-busy="true" className="flex h-72 min-h-36 shrink flex-row flex-wrap content-start gap-1 overflow-hidden">
        {Array.from({ length: 24 }, (_, index) => (
          <Skeleton key={index} className="size-11" />
        ))}
      </div>
    </>
  );
}
