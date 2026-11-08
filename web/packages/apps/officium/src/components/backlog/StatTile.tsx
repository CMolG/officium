"use client";

import type { Clock3 } from "lucide-react";

/** One figure of the contributions summary, with its icon and label. `note` is a muted line under the value. */
export function StatTile({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-3">
      <span className="flex flex-row items-center gap-1.5 text-xs font-medium text-[color:var(--jd-muted)]">
        <Icon size={13} aria-hidden="true" /> {label}
      </span>
      <span className="text-2xl font-black">{value}</span>
      {note && <span className="text-xs text-[color:var(--jd-muted)]">{note}</span>}
    </div>
  );
}
