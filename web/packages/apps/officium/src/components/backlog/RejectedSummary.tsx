"use client";

import { Ban } from "lucide-react";

import { Text } from "@javadaba/ui";

import type { RejectedMetrics } from "../../lib/backlog/types";
import { CATEGORY_CONFIG } from "../../lib/backlog/category-config";
import { REJECTION_REASONS } from "../../lib/backlog/rejection";

const reasonLabel = (id: string) => REJECTION_REASONS.find((r) => r.id === id)?.label ?? id;

/**
 * What the period rejected (card://JAVA-1415), by reason and by kind of work: where the backlog
 * fails, read in the same place as what it delivered. A delivered card later rejected is not in
 * Delivered: delivered means delivered and kept.
 */
export function RejectedSummary({ rejected }: { rejected: RejectedMetrics | undefined }) {
  const total = rejected?.total ?? 0;
  return (
    <section data-testid="rejected-summary">
      <h2 className="mb-2 flex flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        <Ban size={13} aria-hidden="true" />
        <Text>Rejected</Text>
      </h2>
      {!rejected || total === 0 ? (
        <Text className="text-sm text-[color:var(--jd-muted)]">No card was rejected in this period.</Text>
      ) : (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-8">
          <Text className="text-2xl font-black">{total}</Text>
          <ul aria-label="Rejected by reason" className="flex flex-col gap-1">
            {rejected.byReason.map((row) => (
              <li key={row.reason} className="flex flex-row gap-2">
                <Text className="font-medium">{reasonLabel(row.reason)}</Text>
                <Text className="text-[color:var(--jd-muted)]">{row.count}</Text>
              </li>
            ))}
          </ul>
          <ul aria-label="Rejected by category" className="flex flex-col gap-1">
            {rejected.byCategory.map((row) => (
              <li key={row.category ?? "none"} className="flex flex-row gap-2">
                <Text className="font-medium">{row.category ? CATEGORY_CONFIG[row.category].label : "No category"}</Text>
                <Text className="text-[color:var(--jd-muted)]">{row.count}</Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
