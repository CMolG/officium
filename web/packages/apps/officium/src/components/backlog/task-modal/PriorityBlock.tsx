"use client";

import { Select, Text } from "@javadaba/ui";

import { PRIORITY_CONFIG } from "../../../lib/backlog/status-config";
import type { CardDetail, Priority } from "../../../lib/backlog/types";

const ORDER = Object.values(PRIORITY_CONFIG).sort((a, b) => a.weight - b.weight);

/** The card's priority, changed from here (Off-Card, "Priority, sprint and tags · now editable"); a viewer reads it. */
export function PriorityBlock({ detail, readOnly, save }: { detail: CardDetail; readOnly: boolean; save: (priority: Priority) => Promise<void> }) {
  const current = PRIORITY_CONFIG[detail.priority];
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Priority</h3>
      <div data-testid="card-priority" className="text-sm font-bold uppercase">
        {readOnly ? (
          <span className="flex flex-row items-center gap-2">
            <current.icon size={18} style={{ color: current.color }} aria-hidden="true" /> <Text>{current.label}</Text>
          </span>
        ) : (
          <Select
            aria-label="Priority"
            value={detail.priority}
            onChange={(next) => void save(next as Priority)}
            options={ORDER.map((p) => ({ value: p.id, label: p.label, prefix: <p.icon size={16} style={{ color: p.color }} aria-hidden="true" /> }))}
            menuWidth={200}
          />
        )}
      </div>
    </div>
  );
}
