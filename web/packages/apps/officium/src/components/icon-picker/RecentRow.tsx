"use client";

import { Text } from "@javadaba/ui";

import { OptionGrid } from "./OptionGrid";
import type { GridOption } from "./picker-types";

/** What this viewer used lately: shown only when there is something to show. */
export function RecentRow({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: GridOption[];
  selected: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Text id="recent-kicker" as="h3" size="xs" weight="bold" tone="muted">
        {label}
      </Text>
      <OptionGrid labelledBy="recent-kicker" options={options} selected={selected} onPick={onPick} className="" />
    </div>
  );
}
